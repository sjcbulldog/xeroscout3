# Build XeroScout 3

## For Window
Development and packaging works.

### For Development:
1. Clone the repo (git clone https://github.com/sjcbulldog/xeroscout3)
2. Perform the install in the renderer directory (pushd xeroscout3/renderer ; npm install ; popd)
3. Perform the install in the main directory (pushd xeroscout3/renderer ; npm install ; popd)
4. Load the workspace (xeroscout3/main/) in vs code.
5. Run any of the "Run And Debug" configurations in VSCode.

### For Packaging
1. Ensure you have the program 'Inno Setup' installed on your machine.
2. Be sure you have a complete cygwin environment installed on your local machine.
3. Update the version if required in both the package.json in the main directory, and in the xeroscout.iss file in the installer directory.
3. Run the build.sh script to build an installable.

## For Mac OS
Development on Mac OS works.  No effort has going into packaging the electron application for installation
on Mac OS.

### For Development:
1. Clone the repo (git clone https://github.com/sjcbulldog/xeroscout3)
2. Perform the install in the renderer directory (pushd xeroscout3/renderer ; npm install ; popd)
3. Perform the install in the main directory (pushd xeroscout3/renderer ; npm install ; popd)
4. Load the workspace (xeroscout3/main/) in vs code.
5. Run any of the "Run And Debug" configurations in VSCode.

### To Create an application
1. Perform steps 1 - 3 above
2. In the main directory (cd xeroscout3/main), run 'npm run make'
3. In the directory out/xeroscout3-darwin-arm64 there will be an application xeroscout3.app
