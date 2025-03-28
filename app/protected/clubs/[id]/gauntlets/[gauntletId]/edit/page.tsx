import { getGauntletById } from "$/actions/gauntlet";
import { Button } from "$/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function EditGauntletPage({
  params,
}: {
  params: Promise<{ id: string; gauntletId: string }>;
}) {
  // Directly access the params object properties
  const { id, gauntletId } = await params;
  const clubId = parseInt(id);
  const gId = parseInt(gauntletId);

  if (isNaN(clubId) || isNaN(gId)) {
    notFound();
  }

  const { gauntlet, isOwner, error } = await getGauntletById(gId);

  if (error || !gauntlet || !isOwner) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Gauntlet</h1>
        <p className="text-gray-500 mt-1">
          Modify settings for {gauntlet.name}
        </p>
      </div>

      <div className="max-w-2xl w-full bg-white border rounded-lg p-8">
        <div className="text-center py-8">
          <h2 className="text-xl font-medium mb-4">
            Gauntlet Editing Coming Soon
          </h2>
          <p className="text-gray-500 mb-6">
            This feature is still in development. You'll be able to edit
            gauntlet settings in the future.
          </p>
          <Link href={`/protected/clubs/${clubId}/gauntlets/${gauntlet.id}`}>
            <Button>Back to Gauntlet</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

