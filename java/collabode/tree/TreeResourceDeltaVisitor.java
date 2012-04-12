package collabode.tree;

import org.eclipse.core.resources.*;
import org.eclipse.core.runtime.CoreException;

import collabode.Workspace;

public class TreeResourceDeltaVisitor implements IResourceDeltaVisitor {

    @Override
    public boolean visit(IResourceDelta delta) throws CoreException {
        IResource resourceOld = null, resourceNew = null;

        switch (delta.getKind()) {
            case IResourceDelta.ADDED:
                resourceNew = delta.getResource();
                if (delta.getResource() instanceof IFolder) {
                    TreeManager.getTreeManager().folderAdded(resourceNew.getFullPath().toString(), resourceNew.getParent().getFullPath().toString());
                }

                Workspace.scheduleTask("reportNewResource", resourceNew, resourceNew.getParent().getFullPath().toString());
                return false;
            case IResourceDelta.REMOVED:
                resourceOld = delta.getResource();
                if (delta.getResource() instanceof IFolder) {
                    // For each user: remove folder and all children folders from "open" or "visible"
                    TreeManager.getTreeManager().folderRemoved(resourceOld.getFullPath().toString());
                }

                Workspace.scheduleTask("reportRemoveResource", resourceOld, resourceOld.getParent().getFullPath().toString());
                return false;
            case IResourceDelta.CHANGED:
                return true;
        }

        return true;
    }

}
