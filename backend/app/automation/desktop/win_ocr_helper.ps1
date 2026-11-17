Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' }

function Await($asyncOp, $type) {
    $asTask = $asTaskGeneric[0].MakeGenericMethod($type)
    $task = $asTask.Invoke($null, @($asyncOp))
    $task.Wait()
    return $task.Result
}

[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null

$rawPath = $args[0]
if (-not $rawPath) {
    Write-Output "ERR:NO_PATH_SPECIFIED"
    exit
}
$imgPath = [System.IO.Path]::GetFullPath($rawPath)
if (-not (Test-Path $imgPath)) {
    Write-Output "ERR:FILE_NOT_FOUND"
    exit
}

try {
    $fileOp = [Windows.Storage.StorageFile]::GetFileFromPathAsync($imgPath)
    $file = Await $fileOp ([Windows.Storage.StorageFile])

    $streamOp = $file.OpenAsync([Windows.Storage.FileAccessMode]::Read)
    $stream = Await $streamOp ([Windows.Storage.Streams.IRandomAccessStream])

    $decoderOp = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)
    $decoder = Await $decoderOp ([Windows.Graphics.Imaging.BitmapDecoder])

    $bitmapOp = $decoder.GetSoftwareBitmapAsync()
    $softwareBitmap = Await $bitmapOp ([Windows.Graphics.Imaging.SoftwareBitmap])

    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    if (-not $engine) {
        $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new("en-US"))
    }

    $ocrOp = $engine.RecognizeAsync($softwareBitmap)
    $ocrResult = Await $ocrOp ([Windows.Media.Ocr.OcrResult])

    $wordsList = [System.Collections.Generic.List[PSObject]]::new()
    foreach ($line in $ocrResult.Lines) {
        foreach ($word in $line.Words) {
            $wordsList.Add([PSCustomObject]@{
                t = $word.Text
                x = [int][Math]::Round($word.BoundingRect.X)
                y = [int][Math]::Round($word.BoundingRect.Y)
                w = [int][Math]::Round($word.BoundingRect.Width)
                h = [int][Math]::Round($word.BoundingRect.Height)
            })
        }
    }

    $payload = [PSCustomObject]@{
        full_text = $ocrResult.Text
        words = $wordsList
    }

    $json = ConvertTo-Json -InputObject $payload -Depth 4 -Compress
    Write-Output "OCR_JSON_START"
    Write-Output $json
    Write-Output "OCR_JSON_END"
} catch {
    Write-Output "ERR:$($_.Exception.Message)"
}
