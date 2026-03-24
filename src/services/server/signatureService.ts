import forge from "node-forge";
import * as xmldsig from "xmldsigjs";
import { XMLSerializer, DOMParser } from "@xmldom/xmldom";
import { webcrypto } from "node:crypto";
import * as xmlcore from "xml-core";

// Initialize xmldsig with Node.js WebCrypto
xmldsig.Application.setEngine("NodeJS", webcrypto as any);
xmlcore.setNodeDependencies({ DOMParser, XMLSerializer });

export async function signXmlXadesBes(xmlString: string, certPem: string, privateKeyPem: string): Promise<string> {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "application/xml");

  // Load certificate and private key using node-forge
  const cert = forge.pki.certificateFromPem(certPem);
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

  // Convert to DER
  const certB64 = certPem.replace(/(-----(BEGIN|END) CERTIFICATE-----|\r|\n)/g, '');
  const certDerBytes = Buffer.from(certB64, 'base64');
  
  const privateKeyInfo = forge.pki.wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(privateKey));
  const privateKeyDer = forge.asn1.toDer(privateKeyInfo).getBytes();

  // Import the key into WebCrypto
  const cryptoKey = await webcrypto.subtle.importKey(
    "pkcs8",
    Buffer.from(privateKeyDer, "binary"),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const signatureId = "Signature-" + Math.random().toString(36).substring(2, 9);
  const signedPropertiesId = "SignedProperties-" + signatureId;
  const signingTime = new Date().toISOString().split(".")[0] + "Z";

  // Calculate certificate digest
  const certHash = await webcrypto.subtle.digest("SHA-256", certDerBytes);
  const certHashBase64 = Buffer.from(certHash).toString("base64");

  // Get Issuer Name and Serial Number
  const issuerName = cert.issuer.attributes.map(attr => `${attr.shortName}=${attr.value}`).join(", ");
  const serialNumberDec = BigInt("0x" + cert.serialNumber).toString(10);

  // Create XAdES QualifyingProperties XML
  const xadesXml = `
    <ds:Object xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
      <xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Target="#${signatureId}">
        <xades:SignedProperties Id="${signedPropertiesId}">
          <xades:SignedSignatureProperties>
            <xades:SigningTime>${signingTime}</xades:SigningTime>
            <xades:SigningCertificate>
              <xades:Cert>
                <xades:CertDigest>
                  <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256" xmlns:ds="http://www.w3.org/2000/09/xmldsig#"/>
                  <ds:DigestValue xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${certHashBase64}</ds:DigestValue>
                </xades:CertDigest>
                <xades:IssuerSerial>
                  <ds:X509IssuerName xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${issuerName}</ds:X509IssuerName>
                  <ds:X509SerialNumber xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${serialNumberDec}</ds:X509SerialNumber>
                </xades:IssuerSerial>
              </xades:Cert>
            </xades:SigningCertificate>
          </xades:SignedSignatureProperties>
        </xades:SignedProperties>
      </xades:QualifyingProperties>
    </ds:Object>
  `;

  const xadesDoc = parser.parseFromString(xadesXml, "application/xml");

  const signedXml = new xmldsig.SignedXml(xmlDoc);
  
  // Add XAdES Object
  const dataObject = new xmldsig.DataObject();
  dataObject.LoadXml(xadesDoc.documentElement);
  signedXml.XmlSignature.ObjectList.Add(dataObject);
  
  // Set Signature Id
  signedXml.XmlSignature.Id = signatureId;

  // Add X509 Certificate
  const x509Data = new xmldsig.KeyInfoX509Data(certDerBytes);
  signedXml.XmlSignature.KeyInfo.Add(x509Data);

  const signature = await signedXml.Sign(
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    cryptoKey,
    xmlDoc,
    {
      references: [
        { hash: "SHA-256", transforms: ["enveloped", "c14n"] },
        { uri: `#${signedPropertiesId}`, type: "http://uri.etsi.org/01903#SignedProperties", hash: "SHA-256" }
      ]
    }
  );

  xmlDoc.documentElement.appendChild(signature.GetXml());

  return new XMLSerializer().serializeToString(xmlDoc);
}
