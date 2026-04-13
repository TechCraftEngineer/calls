// Verify that test files can be imported without errors
import { test as authTest } from "./tests/fixtures/auth";
import { test as callsTest } from "./tests/fixtures/calls";

console.log("✓ Fixtures import successful");
console.log("- authTest:", typeof authTest);
console.log("- callsTest:", typeof callsTest);

// Try to import helpers
import { AuthHelpers } from "./tests/helpers/auth-helpers";
import { CallsHelpers } from "./tests/helpers/calls-helpers";
import { InvitationHelpers } from "./tests/helpers/invitation-helpers";

console.log("✓ Helpers import successful");
console.log("- AuthHelpers:", typeof AuthHelpers);
console.log("- CallsHelpers:", typeof CallsHelpers);
console.log("- InvitationHelpers:", typeof InvitationHelpers);

console.log("\n✓ All imports successful! Tests structure is valid.");
