export const createId = key => key + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
export const blankFromFields = fields => Object.fromEntries(fields.map(field => [field.key, field.defaultValue ?? ""]));
