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

 
 NOTE: for OS X users, the exported Eclipse.app can be run from the command line 
 with the following command:  ```open -n ./Eclipse.app/ --args 
   -config [full path to
   config] -data [full path to workspace]``` <BR>
   if you would like to user relative paths, the config and data paths are 
   relative to ```Eclipse.app/Contents/MacOS/```
   The data path should be an empty dir, Collabode with create a the correct project.


Running Collabode as a two-headed hydra
---------------------------------------

 * Download the plug-in ```.jar```, or:
   * Copy ```config/collabode.properties.example``` to
     ```config/export/collabode.properties``` and modify
   * Open ```plugin.xml``` and use the "Export Wizard" to create a ```.jar```
 * Drop the ```.jar``` into your Eclipse ```plugins``` directory
 * Launch Eclipse &mdash; **to avoid changes to normal Eclipse behavior, use a
   different workspace for Collabode**
 * If needed, use *Window &rarr; Show View &rarr; Other...* and enable
   "Collabode Server"
 * After launching the server, browse to <http://localhost:9000/>
 
Authentication in Collabode
---------------------------------------
 * Once you are running collabode, unless you are in Development mode, when you will be
  logged in as admin, you will need to authenticate.
  The default authentication scheme for collabode is to allow any username, where the 
  password is the first 4 chars of the MD5 hash.  
 * To find the password for any given username, the following command can be used: 
  ```echo [username] | md5 | cut -c 1-4``` <BR>

