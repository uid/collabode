package collabode.mobile;

import java.io.File;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class Application {

    private static String SRC_DIR = "src";
    private static String PHOTO_DIR = "/static/data/photos";
    private static String PLACEHOLDER_PHOTO = "placeholder-photo.png";
    // A map of username to User data instance
    private static ConcurrentHashMap<String, User> USERS;
    
    @Deprecated
    private static void initializeUsers() {
        USERS = new ConcurrentHashMap<String, User>();
        
        // TODO: This gets a list of users based on everyone who has a 
        // photo in the PHOTO_DIR location.  This will have to be loaded
        // from elsewhere.  There is also a placeholder image 
        // /static/img/mobile/placeholder-photo.png that should be used if
        // the user has no photo
        File photoDir = new File(SRC_DIR + PHOTO_DIR);
        File[] photos = photoDir.listFiles();

        for (File f : photos) {
            String filename = f.getName();
            if (filename.endsWith(".jpg")) {
                String username = filename.substring(0, filename.lastIndexOf("."));
                USERS.put(username, 
                          new User(username, PHOTO_DIR + "/" + filename));
            }
        }
    }
    
    /**
     * Find the photo corresponding to the username or else return the 
     * placeholder photo
     */
    public static String getUserPhoto(String username) {
        String photoFile = PHOTO_DIR + "/" + username + ".jpg";
        if (new File(SRC_DIR + photoFile).exists()) {
            return photoFile;
        }
        return PHOTO_DIR + "/" + PLACEHOLDER_PHOTO;
    }
    
    /**
     * @return a list of User objects storing user information
     */
    @Deprecated
    public static List<User> getUsers() {
        if (USERS == null) {
            initializeUsers();
        }
        
        // XXX: Is there a better way to convert this Collection to something
        // iterable in Javascript?
        ArrayList<User> users = new ArrayList<User>();
        for (Iterator<User> it = USERS.values().iterator(); it.hasNext();) {            
            users.add(it.next());
        }
        return users;
    }
    
    @Deprecated
    public static User getUser(String username) {
        if (USERS == null) {
            initializeUsers();
            USERS.put(username, new User(username));
        }
        User user = USERS.get(username);
        if (user == null) {
            user = new User(username);
            USERS.put(username, user);
        }
        return user;
    }
    
    @Deprecated
    public static void updateUserRunCount(String username) {
        getUser(username).incrementRuns();
    }
    
    @Deprecated
    private static void print(String s) {
        System.out.println("Application: " + s);
    }
}
