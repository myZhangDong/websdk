#! /bin/bash

#get version from package.json
version=`grep version package.json|awk -F '"' '{printf("%s",$4)}'`
demo_name=`grep name package.json|awk -F '"' '{printf("%s",$4)}'`

git_version=`git rev-parse --verify --short=7 HEAD`

echo $demo_name
echo version=$version
echo git_version=$git_version

git_version=.$git_version



echo 'webpack begin...'
webpack
echo 'webpack done!'

rm -rf ${demo_name}
rm -f ${demo_name}-*.zip
rm -rf publish

echo "" >> webrtc/dist/EMedia_sdk-dev.js
echo "//${version}_Git${git_version}" >> webrtc/dist/EMedia_sdk-dev.js
echo "window._emediaVersion = '${version}_Git${git_version}'; " >> webrtc/dist/EMedia_sdk-dev.js
echo "console && console.warn('EMedia version', '${version}_Git${git_version}');" >> webrtc/dist/EMedia_sdk-dev.js


mkdir -p publish/demo/javascript
cp -r demo/images publish/demo
cp -r demo/stylesheet publish/demo
cp -r demo/javascript/dist publish/demo/javascript/
#cp -r demo/javascript/src publish/demo/javascript/

mkdir -p publish/demo0/javascript
cp demo0/index.html publish/demo0
cp -r demo0/javascript/dist publish/demo0/javascript/

cp -r webrtc  publish
rm -r publish/webrtc/src

cp -r pannel  publish
rm -r publish/pannel/src

cp -r helper  publish
rm -r publish/helper/src

cp favicon.ico publish/
cp index.html publish/
cp CHANGELOG.md publish/
cp package.json publish/

cp README.md publish/
cp .babelrc publish/

ls -al publish


echo 'Publish done. ${version}_Git${git_version}!'

mv publish ${demo_name}
zip -r ${demo_name}-${version}${git_version}.zip ${demo_name} > /dev/null
ls -al ${demo_name}*

rm -rf ${demo_name}


echo "${demo_name}-${version}${git_version}.zip created!"