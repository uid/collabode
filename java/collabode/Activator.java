package collabode;

import java.io.File;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Scanner;

import org.osgi.framework.BundleActivator;
import org.osgi.framework.BundleContext;

public class Activator implements BundleActivator {
    
    public void start(BundleContext context) throws Exception {
        setupDatabase();
        net.appjet.oui.main.main(new String[] { "--configFile=./config/collabode-etherpad.localhost.properties" });
    }

    public void stop(BundleContext context) throws Exception {
    }

    private void setupDatabase() throws Exception {
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
                if (!sqle.getSQLState().equals("X0Y32")) {
                    System.out.println(stmt);
                    throw sqle;
                }
            }
        }
        db.close();
    }
}
