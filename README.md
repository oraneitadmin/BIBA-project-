# PLM Markers and Measurements - Style Master Application

This is an SAP Fiori Elements application for managing Style Master data and associated Bill of Materials (BOM). It is built using SAP UI5 (OData v4) and is designed to run in an SAP Fiori Launchpad environment.

## Project Overview

- **Namespace**: `zstylemasterfin.zstylemasterfin`
- **Main Service**: OData v4 Service (`/sap/opu/odata4/sap/zsb_style_master/srvd/sap/zsd_style_master/0001/`)
- **Key Features**:
  - List Report for searching Style Master records.
  - Object Page for detailed view and editing.
  - BOM Management with custom actions (Upload, Sub-BOM, Download Measurement).
  - Optimized layout for Grid Tables to prevent excess vertical space.

## Technical Details

### UI Optimizations
The application uses a custom CSS file located at `webapp/ext/style/custom.css` to manage section heights on the Object Page. This ensures that the BOM section remains compact while still allowing full-screen expansion.

### Extension Logic
Custom controllers are located in `webapp/ext/controller/`:
- `AddSubBom.js`: Logic for adding Sub-BOM entries.
- `DwdMeas.js`: Logic for downloading measurements.
- `UploadMM.js`: Logic for uploading Marker/Measurement data.

## Getting Started

### Prerequisites
- Node.js
- SAP Fiori Tools

### Local Development
1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Use the following commands to start the application:
   - `npm start`: Start with FLP Sandbox.
   - `npm run start-local`: Start with local configuration.
   - `npm run start-mock`: Start with mock data.

## Deployment
The project is configured for deployment to an SAP system. Use `npm run build` to generate the production bundle.

---
**Repository**: [oraneitadmin/BIBA-project-](https://github.com/oraneitadmin/BIBA-project-.git)
