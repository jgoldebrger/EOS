export type UserMetadata = Record<string, unknown> | null | undefined;

export function buildFullName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

function readMetadataString(
  metadata: UserMetadata,
  key: string,
): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseNameFromMetadata(userMetadata?: UserMetadata): {
  firstName: string;
  lastName: string;
} {
  const firstName = readMetadataString(userMetadata, "first_name") ?? "";
  const lastName = readMetadataString(userMetadata, "last_name") ?? "";

  if (firstName || lastName) {
    return { firstName, lastName };
  }

  const fullName = readMetadataString(userMetadata, "full_name");
  if (fullName) {
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return { firstName: parts[0] ?? "", lastName: "" };
    }
    return {
      firstName: parts[0] ?? "",
      lastName: parts.slice(1).join(" "),
    };
  }

  const name = readMetadataString(userMetadata, "name");
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return { firstName: parts[0] ?? "", lastName: "" };
    }
    return {
      firstName: parts[0] ?? "",
      lastName: parts.slice(1).join(" "),
    };
  }

  return { firstName: "", lastName: "" };
}

export function resolveDisplayName({
  userId,
  email,
  userMetadata,
}: {
  userId: string;
  email?: string | null;
  userMetadata?: UserMetadata;
}): string {
  const fullName = readMetadataString(userMetadata, "full_name");
  if (fullName) {
    return fullName;
  }

  const firstName = readMetadataString(userMetadata, "first_name");
  const lastName = readMetadataString(userMetadata, "last_name");
  const composed = buildFullName(firstName ?? "", lastName ?? "");
  if (composed) {
    return composed;
  }

  const name = readMetadataString(userMetadata, "name");
  if (name) {
    return name;
  }

  if (email) {
    const local = email.split("@")[0];
    if (local) {
      return local;
    }
  }

  return `User ${userId.slice(0, 8)}`;
}
