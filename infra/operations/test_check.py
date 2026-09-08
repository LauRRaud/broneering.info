import unittest
from check import backup_healthy
class BackupStateTest(unittest.TestCase):
    def test_age_and_failure(self):
        good=[{'status':{'code':0},'backup':[{'timestamp':{'stop':100}}]}]
        self.assertTrue(backup_healthy(good,110,20))
        self.assertFalse(backup_healthy(good,130,20))
        self.assertFalse(backup_healthy(good,90,20))
        self.assertFalse(backup_healthy([{'status':{'code':0},'backup':[]}],110,20))
        good[0]['status']['code']=1
        self.assertFalse(backup_healthy(good,110,20))
if __name__=='__main__':unittest.main()
