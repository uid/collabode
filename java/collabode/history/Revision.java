package collabode.history;

/**
 * POJO for holding revision information in Java
 */
public class Revision implements Comparable<Revision> {

    public String padId;
    public int num;
    public String author;
    public String timestamp;
    public String cs;
    public String action;
    public int replayId;
    public int replayDataId;
    
    public Revision(String padId, int num, String author, String timestamp, 
            String cs, String action, int replayId, int replayDataId) {
        this.padId = padId;
        this.num = num;
        this.author = author;
        this.timestamp = timestamp;
        this.cs = cs;
        this.action = action;
        this.replayId = replayId;
        this.replayDataId = replayDataId;
    }

    @Override
    public int compareTo(Revision r) {
        return this.timestamp.compareTo(r.timestamp);
    }
    public String toString() {
        return String.format("%d: %s %s %s", 
                this.num, this.timestamp, this.cs, this.action);
    }
}
