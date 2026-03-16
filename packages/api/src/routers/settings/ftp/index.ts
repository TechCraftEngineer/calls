import { checkFtpStatus } from "./check-ftp-status";
import { testFtp } from "./test-ftp";
import { updateFtp } from "./update-ftp";

export const ftpRouter = {
  testFtp,
  checkFtpStatus,
  updateFtp,
};
