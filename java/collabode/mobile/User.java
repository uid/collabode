package collabode.mobile;

import java.util.*;
import java.util.Map.Entry;

import collabode.mobile.stats.*;

public class User {
    
    public String username;
    public String photo;

    private HashMap<String, Statistic> stats;
    
    private static String placeholder_photo = 
        "/static/img/mobile/placeholder-photo.png";
    
    public User(String username) {
        this(username, placeholder_photo);
    }
    
    public User(String username, String photo) {
        this.username = username;
        this.photo = photo;
        
        this.stats = new HashMap<String, Statistic>();
        this.stats.put("runCount", new RunCount());
        this.stats.put("runLog", new RunLog());
        //this.stats.put("runCount", 0);
        //this.stats.put("runLog", new ArrayList<Long>());
    }
    
    @SuppressWarnings("unchecked")
    public void incrementRuns() {
        // Update the run count
        //this.stats.put("runCount", (Integer) (this.stats.get("runCount")) + 1);
        this.stats.get("runCount").log();
        this.stats.get("runLog").log();
        
        System.out.println("runCount: " + this.stats.get("runCount").getJSON());
        System.out.println("runLog: " + this.stats.get("runLog").getJSON());
        
        // Also log the last run
        //System.out.println(this.stats.get("runLog"));
        //ArrayList<Long> runLog = (ArrayList<Long>) this.stats.get("runLog");
        //this.stats.put("runLog", runLog.add(System.currentTimeMillis()));
    }
    
    // TODO: Currently not used, don't need it?
    public Object getStat(Stat stat) {
        switch(stat) {
        case RUN_COUNT:
            return this.stats.get("runCount");
        default:
            return 0;
        }
    }
    
    @SuppressWarnings("unchecked")
    public String getJSON() {
        /*JSONObject stats = new JSONObject();
        Iterator<Entry<String, Statistic>> it = this.stats.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<String, Statistic> entry = 
                (Map.Entry<String, Statistic>)it.next();
            stats.put(entry.getKey(), entry.getValue().getJSON());
            it.remove(); // avoids a ConcurrentModificationException
        }
        //stats.putAll(this.stats);
        
        JSONObject json = new JSONObject();
        json.put("username", this.username);
        json.put("photo", this.photo);
        json.put("stats", stats);
        
        System.out.println(json.toJSONString());
        return json.toJSONString();*/
        return null;
    }
    
    private void print(String s) {
        System.out.println("User (" + this.username + "): " + s);
    }
}
