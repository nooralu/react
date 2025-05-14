import os
import subprocess

def remove_types_of_packages(package):
    cmd = ['flow-remove-types', '--pretty', '--out-dir', './packages-without-types/' + package, './packages/' + package]
    subprocess.run(cmd)

for package in os.listdir('./packages'):
    print(package)
    remove_types_of_packages(package)
