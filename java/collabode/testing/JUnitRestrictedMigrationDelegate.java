package collabode.testing;

import org.eclipse.jdt.internal.junit.launcher.JUnitMigrationDelegate;

/*
 * Needed to avoid restricted access warning on plugin.xml since
 * {@link JUnitMigrationDelegate} is an internal class.
 */
@SuppressWarnings("restriction")
public class JUnitRestrictedMigrationDelegate extends JUnitMigrationDelegate { }
