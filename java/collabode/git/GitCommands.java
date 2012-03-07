package collabode.git;

import java.io.File;
import java.net.URISyntaxException;
import java.util.List;

import org.eclipse.core.resources.IProject;
import org.eclipse.core.resources.IWorkspaceRoot;
import org.eclipse.jgit.api.CloneCommand;
import org.eclipse.jgit.api.errors.JGitInternalException;
import org.eclipse.jgit.transport.URIish;
import org.mortbay.util.IO;

import collabode.ProjectImporter;
import collabode.Workspace;

public class GitCommands {
    
    public static String clone(String uri) throws URISyntaxException, JGitInternalException {
        URIish uriish = new URIish(uri);
        if ( ! uriish.isRemote()) {
            throw new JGitInternalException("Repository must be remote");
        }
        String name = uriish.getHumanishName();
        IWorkspaceRoot root = Workspace.getWorkspace().getRoot();
        File working = new File(root.getLocation().toFile(), name);
        if (working.exists()) {
            throw new JGitInternalException("Destination path already exists");
        }
        try {
            new CloneCommand().setURI(uri).setDirectory(working).call();
        } catch (JGitInternalException jgie) {
            IO.delete(working);
            throw jgie;
        }
        List<IProject> imported = ProjectImporter.importProjects(name);
        if (imported.size() == 1) {
            return imported.get(0).getFullPath().toString();
        } else {
            return root.getFullPath().toString();
        }
    }
}
