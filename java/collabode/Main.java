package collabode;

import java.io.File;
import java.sql.*;
import java.util.Scanner;

public class Main {
    public static void main(String[] args) throws Exception {
        Class.forName("org.apache.derby.jdbc.EmbeddedDriver");
        Connection db = DriverManager.getConnection("jdbc:derby:pads;create=true");
        Scanner schema = new Scanner(new File("config/schema.sql")).useDelimiter(";");
        while (schema.hasNext()) {
            String stmt = schema.next().trim();
            if (stmt.isEmpty()) {
                continue;
            }
            try {
                db.createStatement().execute(stmt);
            } catch (SQLException sqle) {
                if ( ! sqle.getSQLState().equals("X0Y32")) {
                    System.out.println(stmt);
                    throw sqle;
                }
            }
        }
        db.close();
        
        net.appjet.oui.main.main(args);
    }
}
