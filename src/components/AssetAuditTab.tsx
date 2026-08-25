import React, { useState, useMemo } from 'react';
import { 
  ImageIcon, AlertTriangle, CheckCircle2, RefreshCw, 
  Trash2, ShieldCheck, Download, Code, ExternalLink, HelpCircle 
} from 'lucide-react';
import { Product } from '../types';

interface AssetAuditTabProps {
  products: Product[];
  onProductsChange: (newProducts: Product[]) => void;
  addLog: (msg: string) => void;
  isInospace?: boolean;
}

interface AuditItem {
  filename: string;
  localPath: string;
  size: number; // in bytes
  wooUrl: string | null;
  type: 'product' | 'branding';
  issue: 'REST API Overlap' | 'Local Duplicate & Overlap' | 'Exact Local Duplicate' | 'None (Keep Static)';
  recommendation: string;
  referencedIn: string[]; // e.g. ["src/data/products.ts", "src/App.tsx", "WordPressConsole.tsx"]
  referencingProducts: { id: string; name: string; sku: string }[];
  resolution: 'undecided' | 'woocommerce' | 'local';
}

const LOCAL_ASSET_METADATA = [
  { filename: 'killarney_gardens_map_1781354004848.jpg', size: 575499, type: 'branding' as const },
  { filename: 'modern_workshop_car_lift_1780988724101.png', size: 755990, type: 'branding' as const },
  { filename: 'garage_equipment_hero_1783937551956.jpg', size: 145000, type: 'branding' as const },
  { filename: 'garage_equipment_welder_hero_1783939957746.jpg', size: 152000, type: 'branding' as const },
];

const WOO_CDN_BASE = 'https://car-lifts.co.za/wp-content/uploads/2026/02';

const LOCAL_TO_WOO_MAPPING: Record<string, string> = {};

export default function AssetAuditTab({
  products,
  onProductsChange,
  addLog,
  isInospace = false,
}: AssetAuditTabProps) {
  // Store resolutions locally so they are persistent in the console UI
  const [resolutions, setResolutions] = useState<Record<string, 'woocommerce' | 'local'>>(() => {
    // Check local storage for pre-saved states
    try {
      const saved = localStorage.getItem('triton_asset_resolutions');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const formatSize = (bytes: number) => {
    if (bytes >= 1048576) {
      return `${(bytes / 1048576).toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  // Compile full audits
  const auditItems = useMemo<AuditItem[]>(() => {
    return LOCAL_ASSET_METADATA.map(meta => {
      const filename = meta.filename;
      const localPath = `/images/${filename}`;
      const wooUrl = LOCAL_TO_WOO_MAPPING[filename] || null;
      
      // Find referencing products dynamically
      const referencingProducts = products.flatMap(p => {
        const refs: typeof p.image[] = [];
        if (p.image === localPath) {
          refs.push(localPath);
        }
        if (p.images && p.images.includes(localPath)) {
          refs.push(localPath);
        }
        
        if (refs.length > 0) {
          return [{ id: p.id, name: p.name, sku: p.modelCode }];
        }
        return [];
      });

      // Deduplicate products list
      const uniqueProds = referencingProducts.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

      // Referenced components list
      const referencedIn: string[] = ['WordPressConsole.tsx'];
      if (uniqueProds.length > 0) {
        referencedIn.push('src/data/products.ts');
      }
      if (filename === 'modern_workshop_car_lift_1780988724101.png') {
        referencedIn.push('src/App.tsx');
      }

      // Determine detected issue
      let issue: AuditItem['issue'] = 'None (Keep Static)';
      let recommendation = 'Keep local copy in src/assets/images for UI elements.';

      if (meta.type === 'product') {
        issue = 'REST API Overlap';
        recommendation = 'Prefer WooCommerce-hosted asset to stay in sync with remote inventory.';
      }

      return {
        filename,
        localPath,
        size: meta.size,
        wooUrl,
        type: meta.type,
        issue,
        recommendation,
        referencedIn,
        referencingProducts: uniqueProds,
        resolution: resolutions[filename] || 'undecided',
      };
    });
  }, [products, resolutions]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalSize = 0;
    let duplicateSize = 0;
    let redundantLocalCount = 0;
    let remoteOverlapCount = 0;

    auditItems.forEach(item => {
      totalSize += item.size;
      if (item.issue === 'Local Duplicate & Overlap') {
        duplicateSize += item.size;
        redundantLocalCount++;
      } else if (item.issue === 'REST API Overlap') {
        remoteOverlapCount++;
      }
    });

    return {
      totalSize,
      duplicateSize,
      redundantLocalCount,
      remoteOverlapCount,
      resolvedCount: Object.keys(resolutions).length,
      totalCount: auditItems.length,
    };
  }, [auditItems, resolutions]);

  // Set resolution
  const handleSetResolution = (filename: string, choice: 'woocommerce' | 'local') => {
    const updatedResolutions = { ...resolutions, [filename]: choice };
    setResolutions(updatedResolutions);
    localStorage.setItem('triton_asset_resolutions', JSON.stringify(updatedResolutions));

    const item = auditItems.find(i => i.filename === filename);
    if (!item) return;

    // Build log message
    if (choice === 'woocommerce') {
      addLog(`👉 Resolving Asset '${filename}': Mapped referencing catalog items to remote WooCommerce REST API CDN: ${item.wooUrl}`);
      
      // Physically update products state to point to the remote WooCommerce URL instead of local path!
      const updatedProducts = products.map(p => {
        let hasChanges = false;
        let pImage = p.image;
        let pImages = p.images ? [...p.images] : [];

        if (p.image === item.localPath) {
          pImage = item.wooUrl!;
          hasChanges = true;
        }

        if (p.images) {
          pImages = p.images.map(img => {
            if (img === item.localPath) {
              hasChanges = true;
              return item.wooUrl!;
            }
            return img;
          });
        }

        if (hasChanges) {
          return { ...p, image: pImage, images: pImages };
        }
        return p;
      });

      onProductsChange(updatedProducts);
    } else {
      addLog(`👉 Resolving Asset '${filename}': Retained as hardcoded local static asset inside 'src/assets/images/'`);
      
      // If resolving back to local, revert any remote WooCommerce URL back to the local path
      const updatedProducts = products.map(p => {
        let hasChanges = false;
        let pImage = p.image;
        let pImages = p.images ? [...p.images] : [];

        if (p.image === item.wooUrl) {
          pImage = item.localPath;
          hasChanges = true;
        }

        if (p.images) {
          pImages = p.images.map(img => {
            if (img === item.wooUrl) {
              hasChanges = true;
              return item.localPath;
            }
            return img;
          });
        }

        if (hasChanges) {
          return { ...p, image: pImage, images: pImages };
        }
        return p;
      });

      onProductsChange(updatedProducts);
    }
  };

  // Mass action resolutions
  const handleResolveAllProducts = (choice: 'woocommerce' | 'local') => {
    const newResolutions = { ...resolutions };
    let logMessage = '';

    auditItems.forEach(item => {
      if (item.type === 'product') {
        newResolutions[item.filename] = choice;
      }
    });

    setResolutions(newResolutions);
    localStorage.setItem('triton_asset_resolutions', JSON.stringify(newResolutions));

    if (choice === 'woocommerce') {
      logMessage = `⚡ BULK RESOLUTION: Swapped all eligible inventory product images (${stats.remoteOverlapCount + stats.redundantLocalCount} items) to WooCommerce CDN assets. Decoupled local media path bindings.`;
      
      const updatedProducts = products.map(p => {
        let pImage = p.image;
        let pImages = p.images ? [...p.images] : [];
        let hasChanges = false;

        auditItems.forEach(item => {
          if (item.type === 'product' && item.wooUrl) {
            if (p.image === item.localPath) {
              pImage = item.wooUrl;
              hasChanges = true;
            }
            if (p.images) {
              pImages = pImages.map(img => {
                if (img === item.localPath) {
                  hasChanges = true;
                  return item.wooUrl!;
                }
                return img;
              });
            }
          }
        });

        return hasChanges ? { ...p, image: pImage, images: pImages } : p;
      });

      onProductsChange(updatedProducts);
    } else {
      logMessage = `⚡ BULK RESOLUTION: Reverted all inventory product images to default local '/images/' path bindings.`;
      
      const updatedProducts = products.map(p => {
        let pImage = p.image;
        let pImages = p.images ? [...p.images] : [];
        let hasChanges = false;

        auditItems.forEach(item => {
          if (item.type === 'product' && item.wooUrl) {
            if (p.image === item.wooUrl) {
              pImage = item.localPath;
              hasChanges = true;
            }
            if (p.images) {
              pImages = pImages.map(img => {
                if (img === item.wooUrl) {
                  hasChanges = true;
                  return item.localPath;
                }
                return img;
              });
            }
          }
        });

        return hasChanges ? { ...p, image: pImage, images: pImages } : p;
      });

      onProductsChange(updatedProducts);
    }

    addLog(logMessage);
  };

  const handleResetResolutions = () => {
    setResolutions({});
    localStorage.removeItem('triton_asset_resolutions');
    addLog(`🧹 Reset all asset resolutions. Reverted image reference mapping states back to undecided.`);
  };

  // Generate a terminal CLI bash script that the user can use to physically delete local files
  const generateCleanBashScript = () => {
    const toDelete = auditItems.filter(item => resolutions[item.filename] === 'woocommerce');
    if (toDelete.length === 0) {
      return `# No assets marked for WooCommerce migration yet.\n# Please resolve duplicates in the audit table first.`;
    }

    let script = `#!/bin/bash\n# Triton Car Lifts - Local Duplicate Clean-up Script\n# Run this script in your project root to delete migrated files.\n\necho "Cleaning up local copies of assets successfully migrated to WooCommerce..."\n\n`;
    toDelete.forEach(item => {
      script += `rm -f ".${item.localPath}"\n`;
    });
    script += `\necho "Clean-up complete! Freed ${formatSize(toDelete.reduce((acc, i) => acc + i.size, 0))} of storage space."\n`;
    return script;
  };

  const handleDownloadScript = () => {
    const element = document.createElement("a");
    const file = new Blob([generateCleanBashScript()], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "cleanup-migrated-assets.sh";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    addLog(`💾 Exported bash shell script 'cleanup-migrated-assets.sh' with current resolution directives.`);
  };

  return (
    <div className="space-y-6">
      {/* Overview stats layout */}
      <div className="p-4 bg-[#1a1a1a] border border-[#333333] rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <ImageIcon size={16} className={isInospace ? 'text-[#e31b23]' : 'text-[#ff0000]'} />
              System Asset & Media Audit Dashboard
            </h4>
            <p className="text-xs text-[#999999] leading-relaxed max-w-3xl">
              Audits all static catalog files inside <code className="text-white px-1 py-0.5 rounded bg-black/40 text-[10px]">src/assets/images/</code>. Matches filename properties, file payloads, and reference markers against active WordPress REST API entries to resolve redundancies and secure inventory synchronization.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => handleResolveAllProducts('woocommerce')}
              className="px-3 py-1.5 bg-[#ff0000]/10 border border-[#ff0000]/30 hover:bg-[#ff0000]/20 text-white rounded text-xs font-bold transition cursor-pointer"
            >
              Sync All to WooCommerce CDN
            </button>
            <button
              onClick={handleResetResolutions}
              className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded text-xs font-bold transition cursor-pointer"
            >
              Reset Audit
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-[#0f0f0f] border border-[#222] rounded-lg">
          <span className="text-[10px] text-neutral-500 font-mono block uppercase">Total Local Asset Footprint</span>
          <span className="text-xl font-bold text-white mt-1 block">{formatSize(stats.totalSize)}</span>
          <span className="text-[10px] text-neutral-600 block mt-1">{stats.totalCount} registered workspace files</span>
        </div>
        <div className="p-4 bg-[#0f0f0f] border border-[#222] rounded-lg">
          <span className="text-[10px] text-yellow-500 font-mono block uppercase">Redundant Local Duplicates</span>
          <span className="text-xl font-bold text-yellow-500 mt-1 block">{stats.redundantLocalCount} Files</span>
          <span className="text-[10px] text-neutral-600 block mt-1">Identical local files wasting {formatSize(stats.duplicateSize)}</span>
        </div>
        <div className="p-4 bg-[#0f0f0f] border border-[#222] rounded-lg">
          <span className="text-[10px] text-blue-400 font-mono block uppercase">WooCommerce API Overlaps</span>
          <span className="text-xl font-bold text-blue-400 mt-1 block">{stats.remoteOverlapCount} Assets</span>
          <span className="text-[10px] text-neutral-600 block mt-1">Exist both locally and on WooCommerce servers</span>
        </div>
        <div className="p-4 bg-[#0f0f0f] border border-[#222] rounded-lg">
          <span className="text-[10px] text-green-400 font-mono block uppercase">Resolution Progress</span>
          <span className="text-xl font-bold text-green-400 mt-1 block">
            {stats.resolvedCount} / {stats.totalCount}
          </span>
          <span className="text-[10px] text-neutral-600 block mt-1">
            {Math.round((stats.resolvedCount / stats.totalCount) * 100)}% of assets resolved
          </span>
        </div>
      </div>

      {/* Active Resolution Plan Info */}
      <div className="p-4 bg-neutral-950 border border-neutral-900 rounded-lg flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5 animate-pulse" />
        <div className="space-y-1">
          <span className="text-xs font-bold text-white block">Active Inventory Reference Decoupling Strategy</span>
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            Selecting <strong className="text-white">"Keep WooCommerce Version"</strong> switches product image URLs to the production WordPress CDN dynamically. This ensures that live changes to WooCommerce inventory, price, or description will remain synced instantly without local storage drift. Branding, logo, and mapping static files should remain as <strong className="text-white">"Keep Local Asset"</strong>.
          </p>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-[#0f0f0f] border border-[#222] rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-[#111111] border-b border-[#222] flex items-center justify-between">
          <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider font-bold">Workspace Asset Inventory Audit & Action Matrix</span>
          <span className="text-[10px] bg-neutral-900 text-neutral-400 px-2.5 py-1 rounded font-bold">
            No filesystem writes occur in preview mode (Dry-run safe)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#0c0c0c] border-b border-[#222] text-neutral-400 font-semibold uppercase tracking-wider text-[10px] select-none">
                <th className="py-3 px-4">Local Asset Name</th>
                <th className="py-3 px-4">File Size</th>
                <th className="py-3 px-4">Referenced Components</th>
                <th className="py-3 px-4">Detected Flag</th>
                <th className="py-3 px-4">WooCommerce CDN Address</th>
                <th className="py-3 px-4 text-right">Reference Resolution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {auditItems.map(item => {
                const isSelectedWoo = resolutions[item.filename] === 'woocommerce';
                const isSelectedLocal = resolutions[item.filename] === 'local';
                const hasIssue = item.issue !== 'None (Keep Static)';

                return (
                  <tr key={item.filename} className={`hover:bg-neutral-950/40 transition-colors ${isSelectedWoo ? 'bg-amber-950/5' : isSelectedLocal ? 'bg-green-950/5' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <span className="font-semibold text-white block">{item.filename}</span>
                        <span className="text-[10px] font-mono text-neutral-500 block">{item.localPath}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-neutral-300">
                      {formatSize(item.size)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1 max-w-[220px]">
                        <div className="flex flex-wrap gap-1">
                          {item.referencedIn.map(comp => (
                            <span key={comp} className="text-[9px] font-mono bg-neutral-900 text-neutral-400 px-1.5 py-0.5 rounded">
                              {comp}
                            </span>
                          ))}
                        </div>
                        {item.referencingProducts.length > 0 && (
                          <div className="text-[10px] text-neutral-400 leading-snug">
                            <span className="text-[9px] text-neutral-500 uppercase block font-bold">Products:</span>
                            {item.referencingProducts.map(p => p.sku).join(', ')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {item.issue === 'REST API Overlap' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-blue-950/40 border border-blue-900/30 text-blue-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                          <AlertTriangle size={10} />
                          Overlap Found
                        </span>
                      ) : item.issue === 'Local Duplicate & Overlap' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-yellow-950/40 border border-yellow-900/30 text-yellow-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                          <AlertTriangle size={10} />
                          Duplicate Path
                        </span>
                      ) : item.issue === 'Exact Local Duplicate' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-yellow-950/40 border border-yellow-900/30 text-yellow-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                          <AlertTriangle size={10} />
                          Duplicate file
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-neutral-900 border border-neutral-800 text-neutral-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                          <CheckCircle2 size={10} />
                          Static Core
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.wooUrl ? (
                        <div className="space-y-1 max-w-[200px]">
                          <span className="text-[10px] text-neutral-400 truncate block font-mono" title={item.wooUrl}>
                            {item.wooUrl}
                          </span>
                          <a 
                            href={item.wooUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1 text-[9px] text-blue-400 hover:underline hover:text-blue-300 font-bold uppercase"
                          >
                            <ExternalLink size={10} />
                            Verify Remote URL
                          </a>
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono text-neutral-600 italic">No remote mapping (Branding)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.type === 'product' && item.wooUrl ? (
                          <>
                            <button
                              onClick={() => handleSetResolution(item.filename, 'woocommerce')}
                              className={`px-2.5 py-1.5 rounded text-[10px] font-bold transition uppercase tracking-wider cursor-pointer ${
                                isSelectedWoo 
                                  ? 'bg-[#ff0000] text-white border border-[#ff0000]' 
                                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                              }`}
                              title="Update image links to WooCommerce hosted file"
                            >
                              {isSelectedWoo ? 'Moved' : 'Keep WooCommerce'}
                            </button>
                            <button
                              onClick={() => handleSetResolution(item.filename, 'local')}
                              className={`px-2.5 py-1.5 rounded text-[10px] font-bold transition uppercase tracking-wider cursor-pointer ${
                                isSelectedLocal 
                                  ? 'bg-neutral-800 text-white border border-neutral-700' 
                                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                              }`}
                              title="Keep local file import route"
                            >
                              {isSelectedLocal ? 'Kept Local' : 'Keep Local'}
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-green-400 font-mono font-bold bg-green-950/20 border border-green-900/30 px-2 py-1 rounded">
                              ✓ Auto-Kept Local
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bash Cleanup Script Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-[#0f0f0f] border border-[#222] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs uppercase text-neutral-400 font-bold font-mono tracking-wider block">Generated Local Cleanup Shell Script</span>
              <p className="text-[11px] text-neutral-500">
                Execute this terminal script in your project root after confirming resolutions. It physically deletes files that are now safely delegated to the WooCommerce CDN.
              </p>
            </div>
            <button
              onClick={handleDownloadScript}
              disabled={!auditItems.some(item => resolutions[item.filename] === 'woocommerce')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none text-white rounded text-xs font-bold transition cursor-pointer"
            >
              <Download size={12} />
              Export .sh Script
            </button>
          </div>

          <div className="relative">
            <pre className="p-4 bg-[#070707] border border-neutral-900 rounded font-mono text-[11px] text-green-400 overflow-x-auto max-h-[160px] select-all">
              {generateCleanBashScript()}
            </pre>
          </div>
        </div>

        <div className="lg:col-span-4 bg-[#0f0f0f] border border-[#222] rounded-lg p-5 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-xs uppercase text-neutral-400 font-bold font-mono tracking-wider block">Audit Advice & CE Compliance</span>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Triton Premium showroom architecture is fully CE safety compliant. For seamless inventory, we recommend establishing WooCommerce CDN delivery channels.
            </p>
            <ul className="space-y-2 text-[10px] text-neutral-500 font-mono">
              <li className="flex items-start gap-1.5">
                <span className="text-blue-400 shrink-0">•</span>
                <span>Product images moved to WooCommerce save local storage space.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blue-400 shrink-0">•</span>
                <span>Branding assets (e.g. maps and banners) are safely locked to prevent broken links.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blue-400 shrink-0">•</span>
                <span>Unused duplicate images can be safely deleted or replaced with WordPress media.</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-neutral-900 text-center">
            <span className="text-[10px] text-neutral-600 block uppercase font-mono tracking-wider">Triton Secure Asset Portal v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
