import { useState, useEffect } from "react";
import { Share2, Link2, Copy, Mail, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { RecipeShareWithUser, PublicLink } from "@/types/recipe";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ShareRecipeDialogProps {
  recipeId: string;
  recipeName: string;
}

export function ShareRecipeDialog({
  recipeId,
  recipeName,
}: ShareRecipeDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [shares, setShares] = useState<RecipeShareWithUser[]>([]);
  const [publicLink, setPublicLink] = useState<PublicLink | null>(null);
  const [isLoadingLink, setIsLoadingLink] = useState(false);

  useEffect(() => {
    if (open) {
      fetchShares();
      fetchPublicLink();
    }
  }, [open]);

  const fetchShares = async () => {
    try {
      const data = await api.sharing.getRecipeShares(recipeId);
      setShares(data);
    } catch (error) {
      console.error("Failed to fetch shares:", error);
    }
  };

  const fetchPublicLink = async () => {
    try {
      const data = await api.sharing.getPublicLink(recipeId);
      setPublicLink(data);
    } catch (error) {
      console.error("Failed to fetch public link:", error);
    }
  };

  const handleShareWithUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSharing(true);
    try {
      await api.sharing.shareRecipe(recipeId, email.trim(), "view");
      toast.success(`Recipe shared with ${email}`);
      setEmail("");
      fetchShares();
    } catch (error: any) {
      toast.error(error.message || "Failed to share recipe");
    } finally {
      setIsSharing(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    try {
      await api.sharing.removeShare(recipeId, shareId);
      toast.success("Share removed");
      fetchShares();
    } catch (error) {
      toast.error("Failed to remove share");
    }
  };

  const handleCreatePublicLink = async () => {
    setIsLoadingLink(true);
    try {
      const link = await api.sharing.createPublicLink(recipeId);
      setPublicLink(link);
      toast.success("Public link created");
    } catch (error) {
      toast.error("Failed to create public link");
    } finally {
      setIsLoadingLink(false);
    }
  };

  const handleDeletePublicLink = async () => {
    try {
      await api.sharing.deletePublicLink(recipeId);
      setPublicLink(null);
      toast.success("Public link deleted");
    } catch (error) {
      toast.error("Failed to delete public link");
    }
  };

  const getPublicUrl = () => {
    if (!publicLink) return "";
    return `${window.location.origin}/recipes/public/${publicLink.id}`;
  };

  const handleCopyLink = () => {
    const url = getPublicUrl();
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const handleCopyWhatsApp = () => {
    const url = getPublicUrl();
    const message = `Check out this recipe: ${recipeName}\n${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Recipe</DialogTitle>
          <DialogDescription>
            Share "{recipeName}" with other users or create a public link
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">
              <Mail className="h-4 w-4 mr-2" />
              Share with Users
            </TabsTrigger>
            <TabsTrigger value="public">
              <Link2 className="h-4 w-4 mr-2" />
              Public Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <form onSubmit={handleShareWithUser} className="space-y-3">
              <div>
                <Label htmlFor="email">User Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSharing}
                />
              </div>
              <Button type="submit" disabled={isSharing || !email.trim()}>
                {isSharing ? "Sharing..." : "Share Recipe"}
              </Button>
            </form>

            <div className="space-y-2">
              <Label>Shared with ({shares.length})</Label>
              <ScrollArea className="h-[200px] rounded-md border p-2">
                {shares.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Not shared with anyone yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {shares.map((share) => (
                      <div
                        key={share.id}
                        className="flex items-center justify-between p-2 rounded-md bg-muted"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {share.shared_with_email}
                          </p>
                          {share.shared_with_name && (
                            <p className="text-xs text-muted-foreground truncate">
                              {share.shared_with_name}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => handleRemoveShare(share.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="public" className="space-y-4">
            {!publicLink ? (
              <div className="text-center py-6">
                <Link2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground mb-4">
                  Create a public link to share this recipe with anyone, even if they
                  don't have an account.
                </p>
                <Button onClick={handleCreatePublicLink} disabled={isLoadingLink}>
                  {isLoadingLink ? "Creating..." : "Create Public Link"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted">
                  <Label className="text-xs text-muted-foreground">Public URL</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={getPublicUrl()}
                      readOnly
                      className="text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyLink}
                      title="Copy link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleCopyLink}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleCopyWhatsApp}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeletePublicLink}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Delete Public Link
                </Button>

                <p className="text-xs text-muted-foreground">
                  Anyone with this link can view the recipe. Delete the link to revoke
                  access.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
