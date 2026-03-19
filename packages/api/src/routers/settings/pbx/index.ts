import { getPbx } from "./get-pbx";
import { linkPbxUser } from "./link-pbx-user";
import { listPbxEmployees } from "./list-pbx-employees";
import { listPbxNumbers } from "./list-pbx-numbers";
import { syncPbxCallsRoute } from "./sync-pbx-calls";
import { syncPbxDirectoryRoute } from "./sync-pbx-directory";
import { syncPbxRecordingsRoute } from "./sync-pbx-recordings";
import { testPbx } from "./test-pbx";
import { unlinkPbxUser } from "./unlink-pbx-user";
import { updatePbx } from "./update-pbx";
import { updatePbxAccess } from "./update-pbx-access";
import { updatePbxExcludedNumbers } from "./update-pbx-excluded-numbers";
import { updatePbxSyncOptions } from "./update-pbx-sync-options";
import { updatePbxWebhook } from "./update-pbx-webhook";

export const pbxRouter = {
  getPbx,
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
  linkPbxUser,
  unlinkPbxUser,
};
