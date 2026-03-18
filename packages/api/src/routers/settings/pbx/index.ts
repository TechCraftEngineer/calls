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

export const pbxRouter = {
  getPbx,
  updatePbx,
  testPbx,
  syncPbxDirectory: syncPbxDirectoryRoute,
  syncPbxCalls: syncPbxCallsRoute,
  syncPbxRecordings: syncPbxRecordingsRoute,
  listPbxEmployees,
  listPbxNumbers,
  linkPbxUser,
  unlinkPbxUser,
};
