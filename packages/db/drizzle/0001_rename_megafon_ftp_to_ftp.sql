-- Rename integration type megafon_ftp to ftp for generic FTP support
UPDATE workspace_integrations
SET integration_type = 'ftp'
WHERE integration_type = 'megafon_ftp';
