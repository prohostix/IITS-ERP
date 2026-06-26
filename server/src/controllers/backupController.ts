import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import fs from 'fs';
import path from 'path';

// Trigger a JSON-based database tables backup export
export const exportDatabaseBackup = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const backupData: any = {};

    // Get all Prisma models dynamically or list critical tables
    const models = [
      'user', 'organization', 'license', 'department', 'subDepartment',
      'university', 'program', 'studyCenter', 'admissionSession', 
      'programFeeStructure', 'student', 'enrollment', 'invoice', 
      'payment', 'expense', 'target', 'task', 'notification', 'auditLog'
    ];

    for (const model of models) {
      if (prisma[model]) {
        backupData[model] = await prisma[model].findMany();
      }
    }

    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filePath = path.join(backupDir, filename);
    
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));

    res.json({
      success: true,
      message: 'Backup generated successfully',
      filename,
      filePath,
      recordCounts: Object.fromEntries(
        Object.entries(backupData).map(([k, v]: [string, any]) => [k, v.length])
      )
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate database backup',
      error: error.message
    });
  }
});

// Import database backup JSON file payload
export const importDatabaseBackup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { data } = req.body;
  if (!data) {
    res.status(400).json({ success: false, message: 'Missing backup data payload' });
    return;
  }

  try {
    // Process imports inside transaction or table sequentially
    const results: any = {};
    const models = Object.keys(data);

    for (const model of models) {
      if (prisma[model] && Array.isArray(data[model])) {
        let successCount = 0;
        for (const record of data[model]) {
          try {
            await prisma[model].upsert({
              where: { id: record.id },
              update: record,
              create: record,
            });
            successCount++;
          } catch (err) {
            // Ignore single record conflicts during restore
          }
        }
        results[model] = successCount;
      }
    }

    res.json({
      success: true,
      message: 'Backup restored/upserted successfully',
      results
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to restore backup',
      error: error.message
    });
  }
});
