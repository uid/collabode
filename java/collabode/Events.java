package collabode;

public class Events {
    public static void create(String id, String text) {
        System.out.println("[create] " + id + " " + text);
    }
    
    public static void edit(String id, String text) {
        System.out.println("[edit] " + id + " " + text);
    }
}
