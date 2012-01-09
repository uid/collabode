package collabode.mobile;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

public class Application {
	
	private static String SRC_DIR = "src";
	private static String PHOTO_DIR = "/static/data/photos";

	public static List<User> getUsers() {
		List<User> users = new ArrayList<User>();
		File photoDir = new File(SRC_DIR + PHOTO_DIR);
		File[] photos = photoDir.listFiles();
		
		for (File f : photos) {
			String filename = f.getName();
			if (filename.endsWith(".jpg")) {
				String username = filename.substring(0, filename.lastIndexOf("."));
				users.add(new User(username, PHOTO_DIR + "/" + filename));
			}
		}
		return users;
	}
}
