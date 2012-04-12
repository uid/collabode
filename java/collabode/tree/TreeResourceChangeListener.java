package collabode.tree;

import org.eclipse.core.resources.*;
import org.eclipse.core.runtime.CoreException;

public class TreeResourceChangeListener implements IResourceChangeListener {

    public void resourceChanged(IResourceChangeEvent e) {
        IResourceDelta delta = e.getDelta();
        IResourceDeltaVisitor visitor = new TreeResourceDeltaVisitor();

        try {
            delta.accept(visitor);
        } catch (CoreException e1) {
            // TODO Auto-generated catch block
            e1.printStackTrace();
        }

    }
}
