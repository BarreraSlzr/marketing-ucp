# Entity Model (Zod Schemas)

## Core Entity Relationships

```mermaid
erDiagram
    Checkout ||--o{ LineItem : "contains"
    Checkout ||--o| Buyer : "has"
    Checkout ||--o| Payment : "paid via"
    Checkout ||--|{ Total : "summarized by"
    Checkout ||--o{ Message : "may have"
    Checkout ||--|{ Link : "displays"
    Checkout ||--|| UCPCheckoutResponse : "protocol"

    Buyer ||--o| PostalAddress : "billing_address"
    Buyer ||--o| PostalAddress : "shipping_address"
    Payment ||--o| PostalAddress : "billing_address"
    Payment ||--|| PaymentCredential : "credential"

    UCPCheckoutResponse ||--o{ Capability : "supports"

    Checkout {
        string id PK
        enum status "incomplete | requires_escalation | ready_for_complete | complete_in_progress | completed | canceled"
        string currency "ISO 4217"
        datetime expires_at "optional"
    }

    Buyer {
        string email
        string phone "optional"
        string first_name "optional"
        string last_name "optional"
        string customer_id "optional"
        boolean accepts_marketing "optional"
    }

    PostalAddress {
        string line1
        string line2 "optional"
        string city
        string state "optional"
        string postal_code
        string country "ISO 3166-1 alpha-2"
    }

    LineItem {
        string id PK
        string name
        string description "optional"
        int quantity "min 1"
        int unit_price "minor units"
        int total_price "minor units"
        string image_url "optional"
        string sku "optional"
    }

    Total {
        enum type "subtotal | tax | shipping | discount | grand_total"
        string label
        int amount "minor units"
    }

    Payment {
        string handler
    }

    PaymentCredential {
        enum type "token | card"
        string token "if type=token"
        string card_number "if type=card, masked"
        string expiry "if type=card, MM/YY"
        string brand "if type=card"
    }

    Message {
        enum type "error | info"
        string code
        string content
        string path "optional, JSONPath"
        enum severity "optional"
        enum content_type "plain | markdown"
    }

    Link {
        enum rel "privacy_policy | terms_of_service | return_policy | support"
        string href
        string label
    }

    UCPCheckoutResponse {
        string version "YYYY-MM-DD"
    }

    Capability {
        string name "reverse-domain"
        string version "YYYY-MM-DD"
        object config "optional"
    }
```

## nuqs Parser Mapping

Each entity field maps to a flat URL search parameter. The naming convention
uses a `{entity}_{field}` prefix to avoid collisions.

```mermaid
graph LR
    subgraph URL["URL Search Params"]
        bp["buyer_email<br/>buyer_phone<br/>buyer_first_name<br/>buyer_last_name<br/>buyer_customer_id<br/>buyer_accepts_marketing"]
        bap["billing_line1..country"]
        sap["shipping_line1..country"]
        pp["payment_handler<br/>payment_credential_type<br/>payment_token"]
        lip["item_id..item_sku"]
        cp["checkout_id<br/>checkout_status<br/>checkout_currency"]
    end

    subgraph Parsers["nuqs Parser Groups"]
        buyerP["buyerParsers"]
        billingP["billingAddressParsers"]
        shippingP["shippingAddressParsers"]
        paymentP["paymentParsers"]
        lineItemP["lineItemParsers"]
        checkoutP["checkoutParsers"]
    end

    bp --> buyerP
    bap --> billingP
    sap --> shippingP
    pp --> paymentP
    lip --> lineItemP
    cp --> checkoutP

    buyerP --> allParsers["allParsers (aggregated)"]
    billingP --> allParsers
    shippingP --> allParsers
    paymentP --> allParsers
    lineItemP --> allParsers
    checkoutP --> allParsers
    allParsers --> serializer["serializeCheckout()"]
```
