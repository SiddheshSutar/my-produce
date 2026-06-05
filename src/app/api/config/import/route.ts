import { NextRequest, NextResponse } from 'next/server';
import *  as XLSX from 'xlsx';

/**
 * POST /api/config/import
 * Handles Excel file uploads for master data configuration
 * Processes ALL sheets in the workbook
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Read file as buffer
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    if (!workbook || !workbook.Sheets) {
      return NextResponse.json(
        { error: 'Failed to read workbook' },
        { status: 400 }
      );
    }

    const results: any[] = [];
    let totalCreated = 0;

    // Log all available sheets for debugging
    console.log('Available sheets in workbook:', Object.keys(workbook.Sheets));

    // Process ALL sheets in the workbook
    const sheetConfigs = [
      {
        key: 'pricing-condition',
        match: ['pricing'],
        index: 0,
        label: 'Pricing Condition',
      },
      {
        key: 'incoterm',
        match: ['incoterm'],
        index: 1,
        label: 'Incoterm',
      },
      {
        key: 'customer-mapping',
        match: ['customer mapping', 'customer'],
        index: 3,
        label: 'Customer Mapping',
      },
      {
        key: 'pack-type',
        match: ['material'],
        index: 4,
        label: 'Material Mapping (Pack Type)',
      },
      {
        key: 'shipping-lines',
        match: ['brand'],
        index: 5,
        label: 'Brand Mapping',
      },
      {
        key: 'vessels',
        match: ['profit'],
        index: 6,
        label: 'Profit Center Mapping',
      },
      {
        key: 'port-of-loading',
        match: ['singleton', 'singletons', 'port of loading', 'pol', 'port loading'],
        index: 7,
        label: 'Singletons (Port of Loading)',
      },
      {
        key: 'port-of-destination',
        match: ['port of destination', 'pod', 'destination', 'port destination'],
        index: 7,
        label: 'Port of Destination',
      },
      {
        key: 'customer-to-packtype',
        match: ['customer to pack', 'customer pack'],
        index: 8,
        label: 'Customer to Pack Type',
      },
    ];

    // Process each config type
    for (const config of sheetConfigs) {
      let sheetName = Object.keys(workbook.Sheets).find((s) =>
        config.match.some(m => s.toLowerCase().includes(m))
      );

      // If exact match not found, try index-based fallback
      if (!sheetName && config.index < Object.keys(workbook.Sheets).length) {
        sheetName = Object.keys(workbook.Sheets)[config.index];
      }

      if (sheetName && workbook.Sheets[sheetName]) {
        try {
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(sheet);
          const createdCount = rows.length;

          // Enhanced logging for customer-mapping and customer-to-packtype to debug column issues
          if ((config.key === 'customer-mapping' || config.key === 'customer-to-packtype') && rows.length > 0) {
            const configName = config.key === 'customer-mapping' ? 'CUSTOMER MAPPING' : 'CUSTOMER TO PACK TYPE';
            console.log(`\n📋 ${configName} DEBUG (${config.label}):`);
            console.log(`Sheet name: "${sheetName}"`);
            console.log(`Total rows: ${createdCount}`);
            console.log(`Headers (from first row):`, Object.keys(rows[0]));
            console.log(`First 3 rows:`, JSON.stringify(rows.slice(0, 3), null, 2));
            
            // Check for empty or malformed data
            const rowsWithIssues = rows.filter((row: any, idx: number) => {
              const values = Object.values(row).filter(v => v === undefined || v === null || v === '');
              return values.length > Object.keys(row).length / 2; // More than 50% empty
            });
            if (rowsWithIssues.length > 0) {
              console.warn(`⚠️ Found ${rowsWithIssues.length} rows with >50% empty values`);
            }
          }

          console.log(`Processing ${config.key}: found sheet "${sheetName}" with ${createdCount} rows`);

          totalCreated += createdCount;
          results.push({
            configType: config.key,
            sheet: sheetName,
            label: config.label,
            created: createdCount,
            updated: 0,
            failed: [],
            data: rows, // Include actual data for frontend
          });
        } catch (sheetError: any) {
          console.warn(`Error processing sheet ${sheetName}:`, sheetError);
          results.push({
            configType: config.key,
            sheet: sheetName,
            label: config.label,
            created: 0,
            updated: 0,
            failed: [sheetError.message],
          });
        }
      } else {
        console.warn(`Could not find sheet for ${config.key}, tried patterns: ${config.match.join(', ')}`);
      }
    }

    return NextResponse.json({
      message: 'All master data imported successfully.',
      sheets: results,
      summary: {
        totalCreated,
        totalUpdated: 0,
        totalFailed: 0,
      },
    });
  } catch (error: any) {
    console.error('Config import error:', error);
    return NextResponse.json(
      {
        error: 'Import failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
