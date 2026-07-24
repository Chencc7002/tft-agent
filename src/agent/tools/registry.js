import { ToolError } from "./tool-errors.js";

export const AGENT_TOOL_SCHEMA_VERSION = "agent_tool.v1";

function validateDefinition(definition) {
  if (!definition || definition.schemaVersion !== AGENT_TOOL_SCHEMA_VERSION) {
    throw new ToolError(`Tool definition schemaVersion must be ${AGENT_TOOL_SCHEMA_VERSION}`, {
      code: "invalid_tool_definition"
    });
  }
  for (const field of ["name", "description", "source", "riskLevel"]) {
    if (!String(definition[field] ?? "").trim()) {
      throw new ToolError(`Tool definition requires ${field}`, { code: "invalid_tool_definition" });
    }
  }
  if (!definition.inputSchema || definition.inputSchema.type !== "object") {
    throw new ToolError("Tool definition requires an object inputSchema", { code: "invalid_tool_definition" });
  }
  if (definition.inputSchema.additionalProperties !== false) {
    throw new ToolError("Tool definition inputSchema must reject unknown fields", {
      code: "invalid_tool_definition"
    });
  }
  for (const field of ["readOnly", "idempotent", "cacheable"]) {
    if (typeof definition[field] !== "boolean") {
      throw new ToolError(`Tool definition requires boolean ${field}`, {
        code: "invalid_tool_definition"
      });
    }
  }
  if (typeof definition.execute !== "function") {
    throw new ToolError("Tool definition requires execute()", { code: "invalid_tool_definition" });
  }
  if (!Number.isFinite(Number(definition.timeoutMs)) || Number(definition.timeoutMs) <= 0) {
    throw new ToolError("Tool definition requires a positive timeoutMs", { code: "invalid_tool_definition" });
  }
  if (definition.capabilities !== undefined && !Array.isArray(definition.capabilities)) {
    throw new ToolError("Tool definition capabilities must be an array", {
      code: "invalid_tool_definition"
    });
  }
  for (const capability of definition.capabilities ?? []) {
    if (!capability || typeof capability !== "object" || !String(capability.action ?? "").trim()) {
      throw new ToolError("Each tool capability requires an action", {
        code: "invalid_tool_definition"
      });
    }
    for (const field of [
      "requiredEntityTypes",
      "allowedEntityTypes",
      "goals",
      "outputs",
      "requiredConstraints"
    ]) {
      if (capability[field] !== undefined && !Array.isArray(capability[field])) {
        throw new ToolError(`Tool capability ${field} must be an array`, {
          code: "invalid_tool_definition"
        });
      }
    }
  }
  return Object.freeze({
    ...definition,
    name: String(definition.name),
    description: String(definition.description),
    source: String(definition.source),
    readOnly: Boolean(definition.readOnly),
    idempotent: Boolean(definition.idempotent),
    cacheable: Boolean(definition.cacheable),
    capabilities: Object.freeze((definition.capabilities ?? []).map((capability) => Object.freeze({
      ...structuredClone(capability)
    }))),
    trustTier: String(definition.trustTier ?? "first_party"),
    sideEffect: String(definition.sideEffect ?? (definition.readOnly ? "none" : "unspecified")),
    requiresApproval: Boolean(definition.requiresApproval),
    permissions: Object.freeze((definition.permissions ?? []).map(String)),
    credentialScope: String(definition.credentialScope ?? "none"),
    evidenceType: String(definition.evidenceType ?? "unspecified")
  });
}

export class ToolRegistry {
  constructor(definitions = []) {
    this.definitions = new Map();
    for (const definition of definitions) this.register(definition);
  }

  register(definition) {
    const value = validateDefinition(definition);
    if (this.definitions.has(value.name)) {
      throw new ToolError(`Tool is already registered: ${value.name}`, {
        code: "tool_already_registered",
        toolName: value.name
      });
    }
    this.definitions.set(value.name, value);
    return this;
  }

  get(name) {
    return this.definitions.get(String(name)) ?? null;
  }

  list() {
    return [...this.definitions.values()];
  }
}
