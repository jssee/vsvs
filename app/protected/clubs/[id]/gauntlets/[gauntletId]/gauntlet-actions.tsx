"use client";

import { useState } from "react";
import { Button } from "$/components/ui/button";
import { ConfirmationDialog } from "$/app/protected/clubs/components/confirmation-dialog";
import { archiveGauntlet, deleteGauntlet } from "$/actions/gauntlet";
import { BookMarked, Trash2 } from "lucide-react";

interface GauntletActionsProps {
  gauntlet: {
    id: number;
    name: string;
    status: string | null;
  };
  clubId: number;
}

export default function GauntletActions({
  gauntlet,
  clubId,
}: GauntletActionsProps) {
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const isArchived = gauntlet.status === "archived";

  const handleArchive = async () => {
    const formData = new FormData();
    formData.append("gauntletId", gauntlet.id.toString());
    await archiveGauntlet(formData);
    setShowArchiveDialog(false);
  };

  const handleDelete = async () => {
    const formData = new FormData();
    formData.append("gauntletId", gauntlet.id.toString());
    await deleteGauntlet(formData);
    setShowDeleteDialog(false);
  };

  return (
    <>
      {!isArchived && (
        <Button 
          variant="outline" 
          onClick={() => setShowArchiveDialog(true)}
          title="Archive Gauntlet"
        >
          <BookMarked className="mr-2 h-4 w-4" />
          Archive
        </Button>
      )}
      
      <Button 
        variant="destructive" 
        onClick={() => setShowDeleteDialog(true)}
        title="Delete Gauntlet"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </Button>

      {showArchiveDialog && (
        <ConfirmationDialog
          title="Archive Gauntlet"
          message={`Are you sure you want to archive "${gauntlet.name}"? This will make it inactive, but you can still access its data.`}
          confirmText="Archive"
          onCancel={() => setShowArchiveDialog(false)}
          onConfirm={handleArchive}
        />
      )}

      {showDeleteDialog && (
        <ConfirmationDialog
          title="Delete Gauntlet"
          message={`Are you sure you want to delete "${gauntlet.name}"? This action cannot be undone and all associated data will be permanently deleted.`}
          confirmText="Delete"
          onCancel={() => setShowDeleteDialog(false)}
          onConfirm={handleDelete}
          isDestructive
        />
      )}
    </>
  );
}