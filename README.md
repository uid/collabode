Collabode
=========

http://uid.csail.mit.edu/collabode

Collabode is a web-based collaborative software development environment
powered by Eclipse and EtherPad.

To try out Collabode if you already have the [Eclipse][] IDE for Java
installed, download the [Collabode plug-in][] and follow the "two-headed
hydra" instructions below.

  [Eclipse]: http://www.eclipse.org/
  [Collabode plug-in]: http://uid.csail.mit.edu/collabode/download

This system is a research prototype. The software is provided "as is", without
warranty of any kind. Do not use Collabode in a workspace containing code you
have not backed up.


Running Collabode in development
--------------------------------

 * Copy ```config/collabode.properties.example``` to
   ```config/collabode.properties``` and modify
 * Right-click the appropriate ```collabode.[os].[ver].launch```
   configuration and select "Debug As"


Running Collabode as a headless server
--------------------------------------

 * Open ```collabode.product``` and select "Eclipse Product export wizard"
   to export the server application
 * Create a config file based on ```config/collabode.properties.example```
 * Run the server with ```[path to exported eclipse] -config [full path to
   config] -data [full path to workspace]```


Running Collabode as a two-headed hydra
---------------------------------------

 * Download the plug-in ```.jar```, or:
   * Copy ```config/collabode.properties.example``` to
     ```config/export/collabode.properties``` and modify
   * Open ```plugin.xml``` and use the "Export Wizard" to create the
     ```.jar```
 * Drop the ```.jar``` into your Eclipse ```plugins``` directory
 * Launch Eclipse &mdash; **to avoid changes to normal Eclipse behavior, use a
   different workspace for Collabode**
 * If needed, use *Window &rarr; Show View &rarr; Other...* and enable
   "Collabode Server"
 * After launching the server, browse to <http://localhost:9000/>
