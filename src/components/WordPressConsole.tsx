import React, { useState, useEffect } from 'react';
import {
  Package, Layers, Globe, Image, HardDrive, FileSpreadsheet,
  Sliders, Radio, FileCode, Terminal, ShieldAlert, Lock,
  ArrowLeft, GripVertical
} from 'lucide-react';
import { Product, FeaturedCategory } from '../types/index.js';
import {
  ConsoleTabType,
  WordPressConsoleProps,
  ProjectAssetImage,
  MigrationSummaryData,
} from '../types/console.js';

// Re-export utility constants & normalizers for full backward-compatibility
export {
  normalizeProductCategory,
  normalizeCategoryImagePath,
  PROJECT_ASSET_IMAGES,
  DEFAULT_FEATURED_CATEGORIES,
} from '../utils/console/productNormalization.js';
export type { ProjectAssetImage, WordPressConsoleProps } from '../types/console.js';

// Custom Hooks
import { useProductManagement } from '../hooks/console/useProductManagement.js';
import { useCategoryManagement } from '../hooks/console/useCategoryManagement.js';
import { useSEOHandling } from '../hooks/console/useSEOHandling.js';
import { useImageHandling } from '../hooks/console/useImageHandling.js';
import { useBackupRestore } from '../hooks/console/useBackupRestore.js';
import { useCSVImportExport } from '../hooks/console/useCSVImportExport.js';
import { useSyncLogs } from '../hooks/console/useSyncLogs.js';
import { useAdminControls } from '../hooks/console/useAdminControls.js';

// Tab Components
import { ProductsTab } from './console/ProductsTab.js';
import { CategoriesTab } from './console/CategoriesTab.js';
import { SEOTab } from './console/SEOTab.js';
import { AssetsTab } from './console/AssetsTab.js';
import { MediaTab } from './console/MediaTab.js';
import { ImportExportTab } from './console/ImportExportTab.js';
import { AdminTab } from './console/AdminTab.js';
import { ToolsTab } from './console/ToolsTab.js';
import { SyncTab } from './console/SyncTab.js';
import { ShortcodesTab } from './console/ShortcodesTab.js';
import { ConfigTab } from './console/ConfigTab.js';
import { LogsTab } from './console/LogsTab.js';
import { ErrorsTab } from './console/ErrorsTab.js';

// Modal Helpers
import { AssetPickerModal } from './console/AssetPickerModal.js';
import { MigrationSummaryModal } from './console/MigrationSummaryModal.js';
import { safeLocalStorage } from '../utils/safeStorage.js';

export default function WordPressConsole({
  isFullPage = false,
  onBackToShop,
  products: productsProp = [],
  onProductsChange: onProductsChangeProp,
  featuredCategories: featuredCategoriesProp = [],
  onFeaturedCategoriesChange: onFeaturedCategoriesChangeProp,
  theme = 'triton',
  onThemeChange,
  globalSeoTitle,
  onGlobalSeoTitleChange,
  globalSeoDescription,
  onGlobalSeoDescriptionChange,
  onCategoryClick,
  maintenanceMode,
  onMaintenanceModeChange,
}: WordPressConsoleProps) {
  // Theme state
  const [internalTheme, setInternalTheme] = useState<'triton' | 'inospace'>(theme);
  useEffect(() => {
    if (theme) setInternalTheme(theme);
  }, [theme]);

  const handleThemeChange = (newTheme: 'triton' | 'inospace') => {
    setInternalTheme(newTheme);
    if (onThemeChange) onThemeChange(newTheme);
  };

  // Drag & drop tab order management
  const defaultTabOrder: ConsoleTabType[] = [
    'sync', 'products', 'categories', 'seo', 'assets', 'media',
    'shortcodes', 'tools', 'admin', 'config', 'logs', 'errors'
  ];

  const [tabOrder, setTabOrder] = useState<ConsoleTabType[]>(() => {
    const saved = safeLocalStorage.getItem('triton_console_tabs_order');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return defaultTabOrder;
  });

  const [activeTab, setActiveTab] = useState<ConsoleTabType>(() => {
    return tabOrder[0] || 'sync';
  });

  const [draggedTab, setDraggedTab] = useState<string | null>(null);

  const handleTabDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTab(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTabDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleTabDragEnter = (e: React.DragEvent, targetId: ConsoleTabType) => {
    e.preventDefault();
    if (!draggedTab || draggedTab === targetId) return;
    const newOrder = [...tabOrder];
    const draggedIdx = newOrder.indexOf(draggedTab as ConsoleTabType);
    const targetIdx = newOrder.indexOf(targetId);
    if (draggedIdx >= 0 && targetIdx >= 0) {
      newOrder.splice(draggedIdx, 1);
      newOrder.splice(targetIdx, 0, draggedTab as ConsoleTabType);
      setTabOrder(newOrder);
      safeLocalStorage.setItem('triton_console_tabs_order', JSON.stringify(newOrder));
    }
  };

  const handleTabDragEnd = () => {
    setDraggedTab(null);
  };

  // Migration summary modal state
  const [migrationSummary, setMigrationSummary] = useState<MigrationSummaryData | null>(null);

  // Hook 1: Sync Logs
  const { logs, filteredLogs, logFilter, setLogFilter, addLog, clearLogs, exportLogsAsText } = useSyncLogs();

  // Hook 2: Category Management
  const {
    categories,
    featuredCategories,
    selectedCatId,
    setSelectedCatId,
    isAddingCategory,
    isRenamingCategory,
    categoryInputVal,
    setCategoryInputVal,
    handleStartAddCategory,
    handleStartRenameCategory,
    handleSaveNewCategory,
    handleSaveRenamedCategory,
    handleDeleteCategory,
    handleCategoryImgUpload,
    handleAiCategoryImgGenerate,
    isGeneratingCatImage,
    catStyle,
    setCatStyle,
    catAccentColor,
    setCatAccentColor,
    catEnvironment,
    setCatEnvironment,
    catLighting,
    setCatLighting,
    catAspect,
    setCatAspect,
  } = useCategoryManagement({
    featuredCategories: featuredCategoriesProp,
    onFeaturedCategoriesChange: onFeaturedCategoriesChangeProp,
    products: productsProp,
    onProductsChange: onProductsChangeProp,
    addLog,
  });

  // Hook 3: Product Management
  const {
    products,
    filteredProducts,
    editedProduct,
    setEditedProduct,
    searchProductQuery,
    setSearchProductQuery,
    selectedStatusFilter,
    setSelectedStatusFilter,
    saveMessage,
    productToDeleteId,
    autoSyncOnSave,
    setAutoSyncOnSave,
    autoCleanInterval,
    setAutoCleanInterval,
    handleUpdateSpecKey,
    handleUpdateSpecValue,
    handleMoveSpecUp,
    handleMoveSpecDown,
    handleAddSpec,
    handleRemoveSpec,
    handleUpdateFeature,
    handleAddFeature,
    handleRemoveFeature,
    handleUpdateAdditionalImage,
    handleAddAdditionalImage,
    handleRemoveAdditionalImage,
    handleCreateNewProduct,
    handleSaveProduct,
    handleDeleteProduct,
    handleConfirmDelete,
    handleCancelDelete,
    handleBulkAutoFill,
    handleBulkDeleteDrafts,
    handleResetCatalog,
  } = useProductManagement({
    products: productsProp,
    onProductsChange: onProductsChangeProp,
    addLog,
    categories,
  });

  // Hook 4: SEO Handling
  const {
    globalSeoTitle: currentGlobalTitle,
    setGlobalSeoTitle: handleGlobalTitleChange,
    globalSeoDescription: currentGlobalDesc,
    setGlobalSeoDescription: handleGlobalDescChange,
    selectedSeoProductId,
    setSelectedSeoProductId,
    selectedSeoProduct,
    seoRichSnippetReviews,
    setSeoRichSnippetReviews,
    seoRichSnippetStock,
    setSeoRichSnippetStock,
    seoSearchSimulatorQuery,
    setSeoSearchSimulatorQuery,
    isGeneratingAiSeo,
    isGeneratingGlobalSeo,
    isAuditingHealth,
    isAuditingCategory,
    seoHealthData,
    categoryAuditData,
    handleGenerateProductSeo,
    handleGenerateGlobalSeo,
    handleRunSeoHealth,
    handleRunCategoryAudit,
  } = useSEOHandling({
    globalSeoTitle,
    onGlobalSeoTitleChange,
    globalSeoDescription,
    onGlobalSeoDescriptionChange,
    products,
    onProductsChange: onProductsChangeProp,
    addLog,
  });

  // Hook 5: Image Handling
  const {
    allAssets,
    isAssetPickerOpen,
    setIsAssetPickerOpen,
    assetPickerTarget,
    setAssetPickerTarget,
    assetSearchQuery,
    setAssetSearchQuery,
    assetFilterCategory,
    setAssetFilterCategory,
    isGeneratingAiImage,
    handleUploadToLibrary,
    handleSelectAssetImage,
    handleAiSimulateImage,
    handleDeviceImageUpload,
  } = useImageHandling({
    editedProduct,
    setEditedProduct,
    addLog,
  });

  // Hook 6: Backup & Restore
  const {
    backupFile,
    backupPreview,
    isRestoring,
    restoreMessage,
    handleExportFullBackup,
    handleBackupFileSelect,
    handleExecuteBackupRestore,
  } = useBackupRestore({
    products,
    onProductsChange: onProductsChangeProp,
    featuredCategories,
    onFeaturedCategoriesChange: onFeaturedCategoriesChangeProp,
    globalSeoTitle: currentGlobalTitle,
    globalSeoDescription: currentGlobalDesc,
    theme: internalTheme,
    addLog,
  });

  // Hook 7: CSV Import/Export
  const {
    csvFile,
    parsedCsvProducts,
    csvParseErrors,
    isProcessingCsv,
    importMessage,
    handleCsvFileUpload,
    handleImportReplace,
    handleImportAppend,
    handleExportCSV,
    handleDownloadSampleCsv,
    handleDownloadErrorLogJson,
    handleDownloadErrorLogCsv,
  } = useCSVImportExport({
    products,
    onProductsChange: onProductsChangeProp,
    addLog,
  });

  // Hook 8: Admin Controls
  const {
    isUnlocked,
    passcodeInput,
    setPasscodeInput,
    passcodeError,
    passcodeSuccessMessage,
    maintenanceModeState,
    handleVerifyPasscode,
    handleUpdatePasscode,
    handleToggleMaintenance,
    handleLogout,
  } = useAdminControls({
    maintenanceMode,
    onMaintenanceModeChange,
    addLog,
  });

  const tabLabels: Record<ConsoleTabType, { label: string; icon: any }> = {
    sync: { label: 'Live Sync', icon: Radio },
    products: { label: 'Products', icon: Package },
    categories: { label: 'Categories', icon: Layers },
    seo: { label: 'SEO & SERP', icon: Globe },
    assets: { label: 'Asset Audit', icon: Image },
    media: { label: 'Media Storage', icon: HardDrive },
    import_export: { label: 'CSV Import', icon: FileSpreadsheet },
    shortcodes: { label: 'Shortcodes', icon: FileCode },
    tools: { label: 'Tools', icon: Sliders },
    admin: { label: 'Admin', icon: Lock },
    config: { label: 'Config', icon: Sliders },
    logs: { label: 'Logs', icon: Terminal },
    errors: { label: 'Errors', icon: ShieldAlert },
  };

  return (
    <div className="w-full min-h-screen bg-[#0d0d0d] text-neutral-200 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Application Bar */}
      <header className="h-14 border-b border-neutral-800 bg-[#121212] px-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {onBackToShop && (
            <button
              type="button"
              onClick={onBackToShop}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors flex items-center gap-1 text-xs font-bold uppercase tracking-wider"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Storefront</span>
            </button>
          )}

          <div className="h-4 w-px bg-neutral-800" />

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
            <h1 className="text-xs sm:text-sm font-black tracking-wider uppercase text-white">
              Triton Car Lifts &bull; WordPress Console
            </h1>
            <span className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-[10px] font-mono text-neutral-400 hidden sm:inline">
              v3.0.0 Modular
            </span>
          </div>
        </div>

        {/* Global Quick Actions */}
        <div className="flex items-center gap-2">
          {maintenanceModeState && (
            <span className="px-2 py-0.5 bg-amber-950/80 border border-amber-600/40 text-amber-400 text-[10px] font-bold uppercase rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Maintenance Active
            </span>
          )}

          <div className="flex items-center gap-1 text-xs text-neutral-400 font-mono">
            <span className="text-emerald-400 font-bold">{products.length}</span> Products
          </div>
        </div>
      </header>

      {/* Draggable Tab Navigation Bar */}
      <nav className="border-b border-neutral-800 bg-[#141414] px-3 overflow-x-auto flex items-center gap-1 scrollbar-thin">
        {tabOrder.map((tId) => {
          const tabMeta = tabLabels[tId] || { label: tId, icon: Package };
          const Icon = tabMeta.icon;
          const isActive = activeTab === tId;

          return (
            <button
              key={tId}
              type="button"
              draggable
              onDragStart={(e) => handleTabDragStart(e, tId)}
              onDragOver={handleTabDragOver}
              onDragEnter={(e) => handleTabDragEnter(e, tId)}
              onDragEnd={handleTabDragEnd}
              onClick={() => setActiveTab(tId)}
              className={`group px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'border-indigo-500 text-white bg-neutral-900/60'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/30'
              }`}
            >
              <GripVertical
                size={12}
                className="text-neutral-600 group-hover:text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
              />
              <Icon size={14} className={isActive ? 'text-indigo-400' : 'text-neutral-500'} />
              <span>{tabMeta.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Main Console Content */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
        {activeTab === 'products' && (
          <ProductsTab
            products={products}
            filteredProducts={filteredProducts}
            categories={categories}
            editedProduct={editedProduct}
            setEditedProduct={setEditedProduct}
            searchProductQuery={searchProductQuery}
            setSearchProductQuery={setSearchProductQuery}
            selectedStatusFilter={selectedStatusFilter}
            setSelectedStatusFilter={setSelectedStatusFilter}
            saveMessage={saveMessage}
            productToDeleteId={productToDeleteId}
            autoSyncOnSave={autoSyncOnSave}
            setAutoSyncOnSave={setAutoSyncOnSave}
            onOpenAssetPicker={(target) => {
              setAssetPickerTarget(target);
              setIsAssetPickerOpen(true);
            }}
            onAiSimulateImage={handleAiSimulateImage}
            isGeneratingAiImage={isGeneratingAiImage}
            onUploadDeviceImage={handleDeviceImageUpload}
            handleUpdateSpecKey={handleUpdateSpecKey}
            handleUpdateSpecValue={handleUpdateSpecValue}
            handleMoveSpecUp={handleMoveSpecUp}
            handleMoveSpecDown={handleMoveSpecDown}
            handleAddSpec={handleAddSpec}
            handleRemoveSpec={handleRemoveSpec}
            handleUpdateFeature={handleUpdateFeature}
            handleAddFeature={handleAddFeature}
            handleRemoveFeature={handleRemoveFeature}
            handleUpdateAdditionalImage={handleUpdateAdditionalImage}
            handleAddAdditionalImage={handleAddAdditionalImage}
            handleRemoveAdditionalImage={handleRemoveAdditionalImage}
            handleCreateNewProduct={handleCreateNewProduct}
            handleSaveProduct={handleSaveProduct}
            handleDeleteProduct={handleDeleteProduct}
            handleConfirmDelete={handleConfirmDelete}
            handleCancelDelete={handleCancelDelete}
            handleBulkAutoFill={handleBulkAutoFill}
            handleBulkDeleteDrafts={handleBulkDeleteDrafts}
            handleExportCSV={handleExportCSV}
          />
        )}

        {activeTab === 'categories' && (
          <CategoriesTab
            categories={categories}
            featuredCategories={featuredCategories}
            products={products}
            selectedCatId={selectedCatId}
            setSelectedCatId={setSelectedCatId}
            isAddingCategory={isAddingCategory}
            isRenamingCategory={isRenamingCategory}
            categoryInputVal={categoryInputVal}
            setCategoryInputVal={setCategoryInputVal}
            handleStartAddCategory={handleStartAddCategory}
            handleStartRenameCategory={handleStartRenameCategory}
            handleSaveNewCategory={handleSaveNewCategory}
            handleSaveRenamedCategory={handleSaveRenamedCategory}
            handleDeleteCategory={handleDeleteCategory}
            handleCategoryImgUpload={handleCategoryImgUpload}
            handleAiCategoryImgGenerate={handleAiCategoryImgGenerate}
            isGeneratingCatImage={isGeneratingCatImage}
            catStyle={catStyle}
            setCatStyle={setCatStyle}
            catAccentColor={catAccentColor}
            setCatAccentColor={setCatAccentColor}
            catEnvironment={catEnvironment}
            setCatEnvironment={setCatEnvironment}
            catLighting={catLighting}
            setCatLighting={setCatLighting}
            catAspect={catAspect}
            setCatAspect={setCatAspect}
            onProductsChange={onProductsChangeProp}
            addLog={addLog}
          />
        )}

        {activeTab === 'seo' && (
          <SEOTab
            products={products}
            categories={categories}
            globalSeoTitle={currentGlobalTitle}
            setGlobalSeoTitle={handleGlobalTitleChange}
            globalSeoDescription={currentGlobalDesc}
            setGlobalSeoDescription={handleGlobalDescChange}
            selectedSeoProductId={selectedSeoProductId}
            setSelectedSeoProductId={setSelectedSeoProductId}
            selectedSeoProduct={selectedSeoProduct}
            seoRichSnippetReviews={seoRichSnippetReviews}
            setSeoRichSnippetReviews={setSeoRichSnippetReviews}
            seoRichSnippetStock={seoRichSnippetStock}
            setSeoRichSnippetStock={setSeoRichSnippetStock}
            seoSearchSimulatorQuery={seoSearchSimulatorQuery}
            setSeoSearchSimulatorQuery={setSeoSearchSimulatorQuery}
            isGeneratingAiSeo={isGeneratingAiSeo}
            isGeneratingGlobalSeo={isGeneratingGlobalSeo}
            isAuditingHealth={isAuditingHealth}
            isAuditingCategory={isAuditingCategory}
            seoHealthData={seoHealthData}
            categoryAuditData={categoryAuditData}
            handleGenerateProductSeo={handleGenerateProductSeo}
            handleGenerateGlobalSeo={handleGenerateGlobalSeo}
            handleRunSeoHealth={handleRunSeoHealth}
            handleRunCategoryAudit={handleRunCategoryAudit}
            addLog={addLog}
          />
        )}

        {activeTab === 'assets' && (
          <AssetsTab
            products={products}
            onProductsChange={onProductsChangeProp}
            addLog={addLog}
            isInospace={internalTheme === 'inospace'}
          />
        )}

        {activeTab === 'media' && (
          <MediaTab
            products={products}
            onProductsChange={onProductsChangeProp}
            featuredCategories={featuredCategories}
            onFeaturedCategoriesChange={onFeaturedCategoriesChangeProp}
            addLog={addLog}
            isInospace={internalTheme === 'inospace'}
          />
        )}

        {activeTab === 'sync' && (
          <SyncTab
            products={products}
            featuredCategories={featuredCategories}
            addLog={addLog}
          />
        )}

        {activeTab === 'import_export' && (
          <ImportExportTab
            products={products}
            csvFile={csvFile}
            parsedCsvProducts={parsedCsvProducts}
            csvParseErrors={csvParseErrors}
            isProcessingCsv={isProcessingCsv}
            importMessage={importMessage}
            handleCsvFileUpload={handleCsvFileUpload}
            handleImportReplace={handleImportReplace}
            handleImportAppend={handleImportAppend}
            handleExportCSV={handleExportCSV}
            handleDownloadSampleCsv={handleDownloadSampleCsv}
            handleDownloadErrorLogJson={handleDownloadErrorLogJson}
            handleDownloadErrorLogCsv={handleDownloadErrorLogCsv}
            addLog={addLog}
          />
        )}

        {activeTab === 'shortcodes' && (
          <ShortcodesTab products={products} categories={categories} />
        )}

        {activeTab === 'config' && (
          <ConfigTab
            theme={internalTheme}
            onThemeChange={handleThemeChange}
            autoSyncOnSave={autoSyncOnSave}
            setAutoSyncOnSave={setAutoSyncOnSave}
            autoCleanInterval={autoCleanInterval}
            setAutoCleanInterval={setAutoCleanInterval}
            addLog={addLog}
          />
        )}

        {activeTab === 'tools' && (
          <ToolsTab
            products={products}
            onProductsChange={onProductsChangeProp}
            featuredCategories={featuredCategories}
            onFeaturedCategoriesChange={onFeaturedCategoriesChangeProp}
            addLog={addLog}
          />
        )}

        {activeTab === 'admin' && (
          <AdminTab
            isUnlocked={isUnlocked}
            passcodeInput={passcodeInput}
            setPasscodeInput={setPasscodeInput}
            passcodeError={passcodeError}
            passcodeSuccessMessage={passcodeSuccessMessage}
            maintenanceModeState={maintenanceModeState}
            handleVerifyPasscode={handleVerifyPasscode}
            handleUpdatePasscode={handleUpdatePasscode}
            handleToggleMaintenance={handleToggleMaintenance}
            handleLogout={handleLogout}
            handleExportFullBackup={handleExportFullBackup}
            handleBackupFileSelect={handleBackupFileSelect}
            handleExecuteBackupRestore={handleExecuteBackupRestore}
            backupFile={backupFile}
            backupPreview={backupPreview}
            isRestoring={isRestoring}
            restoreMessage={restoreMessage}
            handleResetCatalog={handleResetCatalog}
            addLog={addLog}
          />
        )}

        {activeTab === 'logs' && (
          <LogsTab
            logs={logs}
            filteredLogs={filteredLogs}
            logFilter={logFilter}
            setLogFilter={setLogFilter}
            clearLogs={clearLogs}
            exportLogsAsText={exportLogsAsText}
          />
        )}

        {activeTab === 'errors' && (
          <ErrorsTab
            errors={[]}
            handleDownloadErrorLogJson={handleDownloadErrorLogJson}
            handleDownloadErrorLogCsv={handleDownloadErrorLogCsv}
            addLog={addLog}
          />
        )}
      </main>

      {/* Asset Picker Modal */}
      <AssetPickerModal
        isOpen={isAssetPickerOpen}
        onClose={() => setIsAssetPickerOpen(false)}
        target={assetPickerTarget}
        assets={allAssets}
        searchQuery={assetSearchQuery}
        onSearchChange={setAssetSearchQuery}
        filterCategory={assetFilterCategory}
        onFilterChange={setAssetFilterCategory}
        onSelectImage={handleSelectAssetImage}
        onUploadFile={handleUploadToLibrary}
      />

      {/* Migration Summary Modal */}
      <MigrationSummaryModal
        summary={migrationSummary}
        onClose={() => setMigrationSummary(null)}
      />
    </div>
  );
}
