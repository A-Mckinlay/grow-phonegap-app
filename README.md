# Grow Sensor App

The grow sensor application aims to replicate and extend beyond the fuctionality of the no longer supported Parrot Flower Power Application.

---

# How To Setup For Development

**For Android Deployment**

- Install the Android SDK.
- Install Node.js.
- Use npm to install PhoneGap: ``npm install -g phonegap@latest``
- Restart your terminal.
- Clone this repo.
- Run ``npm install`` in the top level of the project.
- Run ``phonegap build``

**To Deploy on an Android Device**

- Enable developer mode on your device.
- Enable USB debugging.
- Make sure MTP (file transfer) is enabled between the device & machine. This option is normally in the pull down menu when USB is connected. 
- Connect your device to your machine via USB.
- A notfification should appear prompting you to trust your machine, you should do so.
- Run ``phonegap run android`` in the top level of you project.

**To Debug using Chrome Remote Debug Tools**

- Complete the steps to deploy the application to the device.
- Open a chrome window and enter ``about:inspect`` in the omnibox.
- A link should appear on the screen that read "inspect"
- Click on inspect
- You now have developer tools connected to your android device over the android debug bridge (ADB)

**Using the current version of the app**

- The sensor BLE address to be used throughout the application is currently hardcoded in the addressService. Change this to the address of your device. You should be able to use the applications scanning fucntionality and the console to work out your devices address.
- All the buttons on the UI execute functions.
- Start scan scans for your device and initiates the file transfer process once it has connected.
- TestDB, Select history file and Drop table all perform functions on the database but do not return any output.
- Check network will return true or fale dependant on whether you are connected to a network or not.
- The Parse csv does nothing.
- Get csv file returns the csv file stored in the DB
- View Graph takes you to the graph page. 
