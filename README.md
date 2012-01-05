Collabode
=========

http://uid.csail.mit.edu/collabode

Collabode is a web-based collaborative software development environment
powered by Eclipse and EtherPad.


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
