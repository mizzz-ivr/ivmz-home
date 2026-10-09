# infra/contact-attachments

Terraform for the contact form attachment pipeline. **It is not applied by CI and has not been
applied or `terraform validate`d from this repository yet** — review it, then run it yourself.

```bash
cd infra/contact-attachments
terraform init
terraform plan -var bucket_name=ivmz-contact-attachments-<unique>
terraform apply -var bucket_name=ivmz-contact-attachments-<unique>
```

Then follow `docs/contact-attachments.md` to create the app access key out-of-band, set the four
`CONTACT_ATTACH_*` variables in Netlify, run the migration and enable attachments in the CMS.
