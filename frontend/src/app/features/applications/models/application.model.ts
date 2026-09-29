export interface CapabilityItem {
  capability_name: string;
  skill_id: string;
  version?: string;
  risk_level: string;
  permissions?: string[];
  description: string;
  verification_policy?: string;
}

export interface ApplicationItem {
  application_id: string;
  display_name: string;
  executable_names: string[];
  icon_name: string;
  description: string;
  enabled: boolean;
  state: string;
  capabilities_count: number;
  capabilities?: CapabilityItem[];
}

export interface ApplicationDetail extends ApplicationItem {
  window_classes?: string[];
  package_id?: string;
  capabilities: CapabilityItem[];
}
