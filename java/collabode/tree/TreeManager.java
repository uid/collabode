package collabode.tree;

import java.util.*;

import org.eclipse.core.resources.IResource;
import org.eclipse.core.resources.IResourceChangeEvent;
import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.Path;

import collabode.Workspace;

public class TreeManager {

    // Singleton instance
    private static TreeManager tm = new TreeManager();

    // Stores open folders by user
    private Map<String, Set<String>> usersOpenFolders;

    // Stores visible folders by user
    private Map<String, Set<String>> usersVisibleFolders;

    private TreeManager() {

        // Listener for changes to resource tree
        Workspace.getWorkspace().addResourceChangeListener(
                new TreeResourceChangeListener(), IResourceChangeEvent.POST_CHANGE);

        usersOpenFolders = new HashMap<String, Set<String>>();
        usersVisibleFolders = new HashMap<String, Set<String>>();
    }


    public static TreeManager getTreeManager() {
        return tm;
    }

    private void addUserIfNotExists(String user) {
        if (!usersVisibleFolders.containsKey(user)) {
            usersOpenFolders.put(user, new HashSet<String>());
            usersVisibleFolders.put(user, new HashSet<String>());
        }
    }

    // Add folder to set of visible folders
    public synchronized void addVisibleFolder(String user, String folder) {
        addUserIfNotExists(user);
        usersVisibleFolders.get(user).add(folder);
    }

    // Remove folder from set of visible folders
    public synchronized void removeVisibleFolder(String user, String folder) {
        addUserIfNotExists(user);
        usersVisibleFolders.get(user).remove(folder);
    }

    // Handle creation of a new folder
    public synchronized void folderAdded(String folder, String parent) {

        // For all users whose tree should display new folder,
        // add folder to visible folders
        for (String user : usersOpenFolders.keySet()) {
            if (usersOpenFolders.get(user).contains(parent) && usersVisibleFolders.get(user).contains(parent)) {
                usersVisibleFolders.get(user).add(folder);
            }
        }
    }

    // Handle deletion of a folder
    public synchronized void folderRemoved(String folder) {

        // Folders to remove from open and visible folders
        List<String> itemsToRemove = new ArrayList<String>();

        // Remove children of removed folder from open folders
        for (String user : usersVisibleFolders.keySet()) {
            for (String f : usersOpenFolders.get(user)) {
                if (f.startsWith(folder)) {
                    itemsToRemove.add(f);
                }
            }

            usersOpenFolders.get(user).removeAll(itemsToRemove);
            itemsToRemove.clear();
        }

        // Remove children of removed folder from visible folders
        for (String user : usersOpenFolders.keySet()) {
            for (String f : usersVisibleFolders.get(user)) {
                if (f.startsWith(folder)) {
                    itemsToRemove.add(f);
                }
            }

            usersVisibleFolders.get(user).removeAll(itemsToRemove);
            itemsToRemove.clear();
        }
    }

    // Handle folder being opened
    public synchronized void folderOpened(String user, String folderPath) {
        addUserIfNotExists(user);

        IResource resource = Workspace.getWorkspace().getRoot().findMember(new Path(folderPath));

        // Add folder to open folders as long as resource exists
        if (resource != null) {
            usersOpenFolders.get(user).add(folderPath);

            // Add necessary folders to set
            try {
                resource.accept(new TreeResourceAddVisitor(user));
            } catch (CoreException e) {
                e.printStackTrace();
            }
        }
    }

    // Handle folder being closed
    public synchronized void folderClosed(String user, String folderPath) {
        addUserIfNotExists(user);

        IResource resource = Workspace.getWorkspace().getRoot().findMember(new Path(folderPath));

        // Remove folder as long as resource exists
        if (resource != null) {
            usersOpenFolders.get(user).remove(folderPath);

            // Remove necessary folders from set
            try {
                resource.accept(new TreeResourceRemoveVisitor(user));
            } catch (CoreException e) {
                e.printStackTrace();
            }
        }
    }

    // Figure out which users should be notified of change to child of 'parent'
    public synchronized String[] getUsersToNotifyOfChange(String parent) {
        List<String> usersToNotify = new ArrayList<String>();

        for (String user : usersOpenFolders.keySet()) {

            // Notify only if parent folder is open and visible
            if (usersOpenFolders.get(user).contains(parent)
                && usersVisibleFolders.get(user).contains(parent)) {
                usersToNotify.add(user);
            }
        }

        return usersToNotify.toArray(new String[usersToNotify.size()]);
    }

    public synchronized boolean isFolderOpen(String user, String folder) {
        if (!usersOpenFolders.containsKey(user))
            return false;

        if (!usersOpenFolders.get(user).contains(folder)) {
            return false;
        }
        return true;
    }

}
