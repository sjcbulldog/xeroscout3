#!/bin/bash

labelstep() {
    echo '##############################################################'
    echo '##############################################################'
    echo
    echo $1
    echo
    echo '##############################################################'
    echo '##############################################################'
}

labelstep 'Removing old artifacts' 
rm -rf out dist

labelstep 'Compiling the application'
npm run compile

labelstep 'Creating the bundled electron application'
npm run make

labelstep 'Creating the installation package'
pushd installer
/cygdrive/c/Program\ Files\ \(x86\)/Inno\ Setup\ 6/iscc.exe xeroscout.iss
popd
