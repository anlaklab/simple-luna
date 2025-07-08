import { useState, useEffect } from "react";
import { ChatInterface } from "@/components/chat-interface";
import { ArtifactsPreview } from "@/components/artifacts-preview";
import { CommandPalette } from "@/components/command-palette";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Search, Plus, Moon, Menu, Eye } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Home() {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [currentPresentationId, setCurrentPresentationId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const isMobile = useIsMobile();

  // Load saved presentation ID from localStorage on mount
  useEffect(() => {
    const savedPresentationId = localStorage.getItem('lunaCurrentPresentationId');
    if (savedPresentationId) {
      setCurrentPresentationId(savedPresentationId);
    }
  }, []);

  // Save presentation ID to localStorage when it changes
  useEffect(() => {
    if (currentPresentationId) {
      localStorage.setItem('lunaCurrentPresentationId', currentPresentationId);
    }
  }, [currentPresentationId]);

  const handlePresentationCreate = (id: string) => {
    setCurrentPresentationId(id);
    // Show success message indicating work can be resumed
    console.log(`Presentation ${id} created and saved for future sessions`);
  };

  const handleNewPresentation = () => {
    // Clear the current presentation to start fresh
    setCurrentPresentationId(null);
    localStorage.removeItem('lunaCurrentPresentationId');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.metaKey && e.key === "k") {
      e.preventDefault();
      setIsCommandPaletteOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="px-4 py-4 md:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Project Luna</h1>
              {currentPresentationId && (
                <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-muted/50 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Working on presentation #{currentPresentationId}</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {currentPresentationId && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleNewPresentation}
                  className="hidden md:flex"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Presentation
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsCommandPaletteOpen(true)}
                className="hidden md:flex"
              >
                <Search className="w-4 h-4 mr-2" />
                Search (⌘K)
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => window.location.href = "/presentations"}
              >
                <Eye className="w-4 h-4 mr-2" />
                View All
              </Button>
              {isMobile && (
                <Sheet open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Menu className="w-4 h-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full p-0">
                    <ArtifactsPreview presentationId={currentPresentationId} />
                  </SheetContent>
                </Sheet>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {isMobile ? (
        /* Mobile: Single column layout */
        <div className="h-[calc(100vh-80px)] overflow-hidden">
          <ChatInterface 
            presentationId={currentPresentationId}
            onPresentationCreate={handlePresentationCreate}
          />
        </div>
      ) : (
        /* Desktop: Two column layout */
        <div className="flex h-[calc(100vh-80px)] overflow-hidden">
          {/* Left Panel - Chat Interface */}
          <div className="w-2/5 lg:w-1/2 bg-white border-r border-border">
            <ChatInterface 
              presentationId={currentPresentationId}
              onPresentationCreate={handlePresentationCreate}
            />
          </div>

          {/* Right Panel - Artifacts Preview */}
          <div className="flex-1 bg-muted/30">
            <ArtifactsPreview presentationId={currentPresentationId} />
          </div>
        </div>
      )}

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onCreatePresentation={(description) => {
          // The command palette will trigger the presentation creation flow
          console.log("Create presentation from command palette:", description);
          setIsCommandPaletteOpen(false);
        }}
      />
    </div>
  );
}
