import { getPbx } from "./get-pbx";
import { getPbxWebhookSecret } from "./get-pbx-webhook-secret";
import { listPbxEmployees } from "./list-pbx-employees";
import { listPbxNumbers } from "./list-pbx-numbers";
import { syncPbxCallsRoute } from "./sync-pbx-calls";
import { syncPbxDirectoryRoute } from "./sync-pbx-directory";
import { syncPbxRecordingsRoute } from "./sync-pbx-recordings";
import { testPbx } from "./test-pbx";
import { updatePbx } from "./update-pbx";
import { updatePbxAccess } from "./update-pbx-access";
import { updatePbxExcludedNumbers } from "./update-pbx-excluded-numbers";
import { updatePbxSyncOptions } from "./update-pbx-sync-options";
import { updatePbxWebhook } from "./update-pbx-webhook";

export const pbxRouter = {
  getPbx,
  getPbxWebhookSecret,
  updatePbx,
  updatePbxAccess,
  updatePbxExcludedNumbers,
  updatePbxSyncOptions,
  updatePbxWebhook,
  testPbx,
  syncPbxDirectory: syncPbxDirectoryRoute,
  syncPbxCalls: syncPbxCallsRoute,
  syncPbxRecordings: syncPbxRecordingsRoute,
  listPbxEmployees,
  listPbxNumbers,
};
