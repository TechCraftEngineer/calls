ALTER TABLE "user_workspace_settings" ALTER COLUMN "report_settings" SET DEFAULT '{
        "managedUserIds": []
      }'::jsonb;