package collabode.tree;

import org.eclipse.core.resources.IResource;
import org.eclipse.core.resources.IResourceVisitor;
import org.eclipse.core.runtime.CoreException;

public class TreeResourceAddVisitor implements IResourceVisitor {

    private String user;

    public TreeResourceAddVisitor(String user) {
        this.user = user;
    }

    @Override
    public boolean visit(IResource resource) throws CoreException {
        TreeManager manager = TreeManager.getTreeManager();
        String folder;

        switch (resource.getType()) {
            case (IResource.FOLDER):
                folder = resource.getFullPath().toString();
                manager.addVisibleFolder(user, folder);
                return manager.isFolderOpen(user, folder);
            case (IResource.PROJECT):
                folder = resource.getFullPath().toString();
                manager.addVisibleFolder(user, folder);
                return manager.isFolderOpen(user, folder);
        }

        return false;
    }

}
