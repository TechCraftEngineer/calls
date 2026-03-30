ALTER TABLE "user_workspace_settings" ALTER COLUMN "report_settings" SET DEFAULT '{
        "includeCallSummaries": false,
        "detailed": false,
        "includeAvgValue": false,
        "includeAvgRating": false,
        "kpi": false,
        "managedUserIds": []
      }'::jsonb;