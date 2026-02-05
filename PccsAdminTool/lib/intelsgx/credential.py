try:
    import keyring
except:
    keyring = None
import getpass

class Credentials:
    APPNAME = 'PccsAdmin'
    KEY_ADMINTOKEN = 'ADMIN_TOKEN'

    def get_admin_token(self):
        admin_token = ""
        if keyring is not None:
            try:
                print("Please note: A prompt may appear asking for your keyring password to access stored credentials.")
                admin_token = keyring.get_password(self.APPNAME, self.KEY_ADMINTOKEN)
            except keyring.errors.KeyringError as ke:
                admin_token = ""
        
        while admin_token is None or admin_token == '':
            admin_token = getpass.getpass(prompt="Please input your administrator password for PCCS service:")
            # prompt saving password
            if admin_token != "":
                save_passwd = input("Would you like to remember password in OS keyring? (y/n)")
                if save_passwd.lower() == 'y':
                    self.set_admin_token(admin_token)

        return admin_token

    def set_admin_token(self, token):
        if keyring is not None:
            try:
                print("Please note: A prompt may appear asking for your keyring password to access stored credentials.")
                keyring.set_password(self.APPNAME, self.KEY_ADMINTOKEN, token)
            except keyring.errors.PasswordSetError as ke:
                print("Failed to store admin token.")
                return False
        return True
