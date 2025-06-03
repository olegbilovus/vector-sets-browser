import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVectorSettings } from "@/hooks/useVectorSettings";
import { VectorSetMetadata } from "@/lib/types/vectors";
import { useEffect, useState } from "react";
import VectorHeatmapHeader from "./VectorHeatmapHeader";
import VectorSingleView from "./VectorSingleView";
import VectorComparisonView from "./VectorComparisonView";
import VectorVisualizationInfo from "./VectorVisualizationInfo";
import { useVectorComparison } from "@/hooks/useVectorComparison";
import { useVectorDownload } from "@/hooks/useVectorDownload";

interface VectorHeatmapProps {
  vector: number[] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vectorSetName?: string | null;
  metadata?: VectorSetMetadata | null;
  searchVector?: number[] | null;
  elementName?: string | null;
  searchQuery?: string | null;
  lastSearchDisplayName?: string | null;
}

export default function VectorHeatmap({
  vector,
  open,
  onOpenChange,
  vectorSetName = null,
  metadata = null,
  searchVector = null,
  elementName = null,
  searchQuery = null,
  lastSearchDisplayName = null,
}: VectorHeatmapProps) {
  const [forceRender, setForceRender] = useState(0);
  const {
    settings,
    setColorScheme,
    setScalingMode,
    setVisualizationType,
    isImageBased,
    makeDefault,
  } = useVectorSettings(vectorSetName, metadata);

  const { showComparison, canCompare, handleComparisonToggle } = useVectorComparison({
    open,
    searchVector,
    resultVector: vector,
  });

  const { downloadVisualization } = useVectorDownload({
    showComparison,
    visualizationType: settings.visualizationType,
    elementName,
  });

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        setForceRender((prev) => prev + 1);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [
    open,
    settings.colorScheme,
    settings.scalingMode,
    settings.visualizationType,
    showComparison,
  ]);

  const handleMakeDefault = () => {
    const success = makeDefault();
    if (success) {
      const vectorType = isImageBased ? "image/multimodal" : "text";
      console.log(`Settings saved as default for all ${vectorType} vectorsets`);
    } else {
      console.error("Failed to save settings as default");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <VectorHeatmapHeader
          canCompare={canCompare}
          showComparison={showComparison}
          onComparisonToggle={handleComparisonToggle}
          onDownload={downloadVisualization}
          onMakeDefault={handleMakeDefault}
          onClose={() => onOpenChange(false)}
          vectorSetName={vectorSetName}
          isImageBased={isImageBased}
        />

        <Tabs
          value={settings.visualizationType}
          onValueChange={(value) => setVisualizationType(value as any)}
        >
          <div className="flex items-center mb-4 space-x-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="heatmap">🔥 Heatmap</TabsTrigger>
              <TabsTrigger value="distribution">📊 Distribution</TabsTrigger>
              <TabsTrigger value="radial">⭕ Radial</TabsTrigger>
            </TabsList>
          </div>

          {showComparison && canCompare ? (
            <VectorComparisonView
              searchVector={searchVector}
              resultVector={vector}
              colorScheme={settings.colorScheme}
              scalingMode={settings.scalingMode}
              visualizationType={settings.visualizationType}
              onColorSchemeChange={setColorScheme}
              onScalingModeChange={setScalingMode}
              searchQuery={searchQuery}
              lastSearchDisplayName={lastSearchDisplayName}
              elementName={elementName}
              forceRender={forceRender}
            />
          ) : (
            <VectorSingleView
              vector={vector}
              colorScheme={settings.colorScheme}
              scalingMode={settings.scalingMode}
              visualizationType={settings.visualizationType}
              onColorSchemeChange={setColorScheme}
              onScalingModeChange={setScalingMode}
              forceRender={forceRender}
            />
          )}
        </Tabs>

        <VectorVisualizationInfo
          visualizationType={settings.visualizationType}
          canCompare={canCompare}
          showComparison={showComparison}
        />
      </DialogContent>
    </Dialog>
  );
}
