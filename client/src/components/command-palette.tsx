import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Search,
  Eye,
  Database,
  Activity,
  BookOpen,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePresentations } from "@/hooks/use-presentations";

// Types
interface Presentation {
  id: string;
  title: string;
  description?: string;
  author?: string;
  status: string;
  slideCount?: number;
  updatedAt: string;
}

// Custom overlay with higher z-index for Command Palette
const CommandPaletteOverlay = () => (
  <DialogOverlay className="fixed inset-0 !z-[9998] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
);

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePresentation: (description: string) => void;
}

interface Command {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  keywords: string[];
  category?: string;
}

export function CommandPalette({ isOpen, onClose, onCreatePresentation }: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { presentations } = usePresentations();

  // Generate commands based on Firebase presentations + static commands
  const generateCommands = (): Command[] => {
    const commands: Command[] = [];

    // Static essential commands
    const staticCommands: Command[] = [
      {
        id: "view-all-presentations",
        title: "View All Presentations",
        description: "Browse all presentations from Firebase",
        icon: <Eye className="w-4 h-4" />,
        action: () => {
          window.location.href = "/presentations";
          onClose();
        },
        keywords: ["presentations", "browse", "all", "list", "firebase"],
        category: "Navigation"
      },
      {
        id: "swagger-ui",
        title: "API Documentation (Swagger)",
        description: "Interactive API documentation and testing interface",
        icon: <BookOpen className="w-4 h-4" />,
        action: () => {
          window.open("http://localhost:3000/api/v1/docs", "_blank");
          onClose();
        },
        keywords: ["swagger", "swaggerui", "api", "docs", "documentation"],
        category: "Documentation"
      },
      {
        id: "health-status",
        title: "Server Health Status",
        description: "Check system health and API status",
        icon: <Activity className="w-4 h-4" />,
        action: () => {
          window.open("http://localhost:3000/api/v1/health", "_blank");
          onClose();
        },
        keywords: ["health", "status", "api", "server", "monitoring"],
        category: "Infrastructure"
      }
    ];

    commands.push(...staticCommands);

    // Add Firebase presentations as commands (recent 10)
    const recentPresentations = presentations
      .sort((a: Presentation, b: Presentation) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10);

    recentPresentations.forEach((presentation: Presentation) => {
      commands.push({
        id: `presentation-${presentation.id}`,
        title: presentation.title,
        description: `Open "${presentation.title}" • ${presentation.slideCount || 0} slides • ${presentation.status}`,
        icon: <FileText className="w-4 h-4" />,
        action: () => {
          window.open(`/presentations/${presentation.id}/analysis`, "_blank");
          onClose();
        },
        keywords: [
          presentation.title.toLowerCase(),
          presentation.description?.toLowerCase() || "",
          presentation.author?.toLowerCase() || "",
          presentation.status,
          "presentation",
          "slides"
        ],
        category: "Recent Presentations"
      });
    });

    return commands;
  };

  const commands = generateCommands();

  const filteredCommands = commands.filter(command => 
    command.title.toLowerCase().includes(search.toLowerCase()) ||
    command.description.toLowerCase().includes(search.toLowerCase()) ||
    command.keywords.some(keyword => keyword.includes(search.toLowerCase()))
  );

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, command) => {
    const category = command.category || "Other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(command);
    return acc;
  }, {} as Record<string, Command[]>);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
        case "Escape":
          onClose();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  const handleCommandClick = (command: Command) => {
    command.action();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <CommandPaletteOverlay />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] !z-[9999] grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border-2 border-gray-200 bg-white p-0 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg max-h-[80vh] overflow-hidden">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Command Palette</DialogPrimitive.Title>
            <DialogPrimitive.Description>
              Search presentations and access key features
            </DialogPrimitive.Description>
          </VisuallyHidden.Root>
          <div className="border-b border-border bg-white">
            <div className="flex items-center space-x-3 px-3 py-3 md:px-4 bg-white">
              <Search className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
              <Input
                placeholder="Search presentations, docs, or status..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-0 focus-visible:ring-0 text-base md:text-lg bg-white"
                autoFocus
              />
              <kbd className="px-2 py-1 bg-muted text-muted-foreground text-xs md:text-sm rounded hidden sm:inline">
                ⌘K
              </kbd>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto bg-white">
            {filteredCommands.length === 0 ? (
              <div className="p-8 text-center bg-white">
                <div className="w-12 h-12 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Search className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">No results found</h3>
                <p className="text-muted-foreground text-sm">
                  Try searching for presentation names, "swagger", or "health"
                </p>
              </div>
            ) : (
              <div className="py-2 bg-white">
                {Object.entries(groupedCommands).map(([category, categoryCommands]) => (
                  <div key={category} className="mb-4">
                    <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-gray-50">
                      {category}
                    </div>
                    {categoryCommands.map((command, index) => {
                      const globalIndex = filteredCommands.indexOf(command);
                      return (
                        <Button
                          key={command.id}
                          variant="ghost"
                          className={cn(
                            "w-full justify-start px-4 py-3 h-auto text-left hover:bg-accent/50 bg-white hover:bg-gray-50",
                            selectedIndex === globalIndex && "bg-gray-100"
                          )}
                          onClick={() => handleCommandClick(command)}
                        >
                          <div className="flex items-center space-x-3 w-full">
                            <div className="text-primary">
                              {command.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-foreground truncate">
                                {command.title}
                              </div>
                              <div className="text-sm text-muted-foreground truncate">
                                {command.description}
                              </div>
                            </div>
                            {command.category === "Recent Presentations" && (
                              <div className="flex items-center space-x-1">
                                <Database className="w-3 h-3 text-blue-500" />
                                <span className="text-xs text-muted-foreground">Firebase</span>
                              </div>
                            )}
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-4 py-3 bg-gray-50 border-t border-border">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-border rounded text-xs">
                    ↑↓
                  </kbd>
                  <span>Navigate</span>
                </div>
                <div className="flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-border rounded text-xs">
                    ↵
                  </kbd>
                  <span>Open</span>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-border rounded text-xs">
                  Esc
                </kbd>
                <span>Close</span>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
