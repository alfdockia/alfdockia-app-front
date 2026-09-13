/* cspell:disable */

export const ALFDOCKIA_AGENTS_WEBSCRIPT = 'api/-default-/public/alfdockia/versions/1/agents';

export const DEFAULT_AGENT_JSON = `{
  "name": "content-classifier",
  "image": "ghcr.io/alfdockia/alfdockia-agent:latest",
  "ports": [
    {
      "containerPort": 8080,
      "hostPort": 18080,
      "protocol": "tcp"
    }
  ],
  "listener": {
    "passwordSecretRef": {
      "secretRef": "alfdockia.listener.password"
    },
    "passwordEnvName": "CONTENT_SERVICE_SECURITY_BASICAUTH_PASSWORD"
  },
  "env": {
    "CONTENT_SERVICE_URL": "http://alfresco:8080/alfresco"
  }
}`;

export interface AiAgentPortMapping {
  containerPort: number;
  hostPort: number;
  protocol?: string;
}

export interface AiAgentSecretRef {
  secretRef: string;
}

export interface AiAgentListenerConfig {
  passwordSecretRef?: AiAgentSecretRef;
  passwordEnvName?: string;
}

export interface AiAgentDeployRequest {
  name: string;
  image: string;
  ports?: AiAgentPortMapping[];
  listener?: AiAgentListenerConfig;
  env?: {
    [key: string]: string;
  };
}

export interface AiAgentSummary {
  agentId: string;
  name: string;
  image: string;
  desiredState: string;
  currentState: string;
  health?: string;
  containerId?: string;
  nodeId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AiAgentDetail extends AiAgentSummary {
  config?: AiAgentDeployRequest;
  configJson?: string;
}

export interface AiAgentDeleteResponse {
  deleted: boolean;
  agentId: string;
}

export interface AiAgentList {
  count: number;
  items: AiAgentSummary[];
}

export interface AiAgentDeployResponse {
  agentId: string;
  name: string;
  desiredState: string;
  currentState: string;
  statusUrl: string;
}

export interface AlfDockiaApiError {
  statusCode: number;
  code: string;
  message: string;
}

export interface AlfDockiaApiEnvelope<T> {
  data?: T;
  error?: AlfDockiaApiError;
  action?: string;
  location?: string;
  links?: {
    [key: string]: string;
  };
}
