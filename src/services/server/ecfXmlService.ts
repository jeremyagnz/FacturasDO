import { create } from 'xmlbuilder2';

export interface EcfData {
  type: 'E31' | 'E32' | 'E33' | 'E34';
  ecf: string;
  date: string;
  issuer: {
    rnc: string;
    name: string;
    address: string;
    phone: string;
  };
  customer: {
    rnc: string;
    name: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    price: number;
    itbis: number;
  }>;
  totals: {
    subtotal: number;
    itbis: number;
    total: number;
  };
  relatedEcf?: string; // For E33, E34
}

export function generateEcfXml(data: EcfData): string {
  const { type, ecf, date, issuer, customer, items, totals, relatedEcf } = data;
  
  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('eCF', {
      'xmlns': 'http://dgii.gov.do/sicf/eCF',
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:schemaLocation': 'http://dgii.gov.do/sicf/eCF eCF.xsd'
    })
    .ele('Encabezado')
      .ele('IdDoc')
        .ele('TipoeCF').txt(type.substring(1)).up() // E31 -> 31
        .ele('eCF').txt(ecf).up()
        .ele('FechaEmision').txt(date.split('T')[0]).up()
      .up()
      .ele('Emisor')
        .ele('RNCEmisor').txt(issuer.rnc).up()
        .ele('RazonSocialEmisor').txt(issuer.name).up()
        .ele('DireccionEmisor').txt(issuer.address).up()
        .ele('TelefonoEmisor').txt(issuer.phone).up()
      .up()
      .ele('Receptor')
        .ele('RNCReceptor').txt(customer.rnc).up()
        .ele('RazonSocialReceptor').txt(customer.name).up()
      .up()
      .ele('Totales')
        .ele('MontoGravadoTotal').txt(totals.subtotal.toFixed(2)).up()
        .ele('MontoITBISTotal').txt(totals.itbis.toFixed(2)).up()
        .ele('MontoTotal').txt(totals.total.toFixed(2)).up()
      .up();

  if (relatedEcf) {
    root.ele('InformacionReferencia')
      .ele('Referencia')
        .ele('eCFModificado').txt(relatedEcf).up()
      .up()
    .up();
  }

  root.up() // Back to eCF
    .ele('DetallesItems');

  items.forEach((item, index) => {
    root.ele('Item')
      .ele('NumeroLinea').txt((index + 1).toString()).up()
      .ele('NombreItem').txt(item.description).up()
      .ele('CantidadItem').txt(item.quantity.toFixed(2)).up()
      .ele('PrecioUnitarioItem').txt(item.price.toFixed(2)).up()
      .ele('MontoItem').txt((item.quantity * item.price).toFixed(2)).up()
    .up();
  });

  return root.end({ prettyPrint: true });
}
