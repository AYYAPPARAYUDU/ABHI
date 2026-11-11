"""
Tests for ABHI Machine Learning Prediction Engine & Telemetry Forecasts
=======================================================================
Verifies:
1. Double Exponential Smoothing (Holt-Winters) + AR(2) Time Series Forecasting.
2. Ridge Regression for task latency and hardware stress prediction.
3. Softmax Multi-Class Intent Classifier with probability distributions.
4. K-Means (Lloyd's relaxation) clustering and Z-score anomaly detector.
5. FastAPI endpoints under /agent/ml/* and /agent-gateway/ml/*.
"""

import pytest
import numpy as np
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.app.cognitive.ml.prediction_engine import prediction_engine


def test_time_series_forecasting():
    """Verify time series forecasting with Holt-Winters + AR(2)."""
    res = prediction_engine.forecast_resource_timeseries(metric="cpu_percent", horizon=10)
    assert "metrics" in res
    assert "mae" in res["metrics"]
    assert "rmse" in res["metrics"]
    assert res["metrics"]["rmse"] >= 0.0

    chart = res["chart"]
    assert len(chart["forecast_values"]) == 10
    assert len(chart["confidence_upper"]) == 10
    assert len(chart["confidence_lower"]) == 10

    # Test that confidence bounds surround the forecast
    for pred, upper, lower in zip(chart["forecast_values"], chart["confidence_upper"], chart["confidence_lower"]):
        assert upper >= pred >= lower


def test_ridge_regression_prediction():
    """Verify Ridge Regression L2 task prediction."""
    res = prediction_engine.predict_task_latency_and_load(
        token_count=2000,
        complexity_depth=3,
        agent_squad_count=4,
        l2_lambda=0.1
    )
    assert res["algorithm"].startswith("Ridge Regression")
    preds = res["predictions"]
    assert preds["expected_latency_seconds"] > 0.0
    assert preds["expected_ram_mb"] > 0.0
    assert "r2_score" in res["metrics"]
    assert res["metrics"]["r2_score"] > 0.0


def test_softmax_intent_classifier():
    """Verify Softmax Multi-Class Squad Classifier."""
    res_code = prediction_engine.classify_squad_intent("edit files, compile and run terminal command")
    assert res_code["predicted_squad"] == "CODE_FORGE_SQUAD"
    assert res_code["confidence"] > 0.25

    res_browse = prediction_engine.classify_squad_intent("open website, scrape DOM and click search")
    assert res_browse["predicted_squad"] == "WEB_BROWSER_SQUAD"

    chart_vals = res_browse["chart"]["values"]
    assert abs(sum(chart_vals) - 100.0) < 1.0  # Percentage sums to ~100%


def test_kmeans_clustering_and_anomalies():
    """Verify K-Means clustering and anomaly detection."""
    res = prediction_engine.cluster_system_operating_regimes(k=3)
    assert res["clusters_count"] == 3
    assert len(res["clusters"]) == 3
    assert "inertia_wcss" in res
    assert res["inertia_wcss"] >= 0.0
    assert "current_state" in res
    assert "is_thermal_anomaly" in res["current_state"]


@pytest.mark.asyncio
async def test_ml_api_endpoints():
    """Verify FastAPI routes for ML suite and predictions."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Full Suite
        resp = await client.get("/api/v1/agent/ml/suite")
        assert resp.status_code == 200
        suite = resp.json()["data"]
        assert "models" in suite
        assert "forecast_cpu" in suite["models"]
        assert "task_regression" in suite["models"]

        # Timeseries forecast
        resp_fc = await client.get("/api/v1/agent/ml/forecast?metric=ram_percent&horizon=8")
        assert resp_fc.status_code == 200
        assert len(resp_fc.json()["forecast"]["chart"]["forecast_values"]) == 8

        # Task Prediction
        resp_reg = await client.post("/api/v1/agent/ml/predict-task", json={
            "token_count": 1200,
            "complexity_depth": 2,
            "agent_squad_count": 3
        })
        assert resp_reg.status_code == 200
        assert resp_reg.json()["prediction"]["predictions"]["expected_latency_seconds"] > 0

        # Squad Intent Classification
        resp_cls = await client.post("/api/v1/agent-gateway/ml/classify-intent", json={
            "query": "guard system security against attacks"
        })
        assert resp_cls.status_code == 200
        assert resp_cls.json()["classification"]["predicted_squad"] == "SECURITY_SQUAD"

        # Clusters
        resp_cl = await client.get("/api/v1/agent-gateway/ml/clusters?k=3")
        assert resp_cl.status_code == 200
        assert len(resp_cl.json()["clusters"]["clusters"]) == 3

