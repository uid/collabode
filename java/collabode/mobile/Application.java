package collabode.mobile;

import java.io.File;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class Application {

    private static String SRC_DIR = "src";
    private static String PHOTO_DIR = "/static/data/photos";
    // A map of username to User data instance
    private static ConcurrentHashMap<String, User> USERS;
    
    /**
     * @return a list of User objects storing user information
     */
    public static List<User> getUsers() {
        if (USERS == null) {
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
        
        // XXX: Is there a better way to convert this Collection to something
        // iterable in Javascript?
        ArrayList<User> users = new ArrayList<User>();
        for (Iterator<User> it = USERS.values().iterator(); it.hasNext();) {            
            users.add(it.next());
        }
        return users;
    }
    
    public static User getUser(String username) {
        User user = USERS.get(username);
        if (user == null) {
            user = new User(username);
            USERS.put(username, user);
        }
        return user;
    }
    
    public static void updateUserRunCount(String username) {
        getUser(username).incrementRuns();
    }
    
    private static void print(String s) {
        System.out.println("Application: " + s);
    }
}
