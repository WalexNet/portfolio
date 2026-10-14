/*
 * Portfolio Web - Prism.js: configuraciones de red
 * Cisco IOS/IOS XE, Huawei VRP, MikroTik RouterOS, Nokia SR OS Classic,
 * Aruba AOS-CX, Fortinet FortiOS y sintaxis genérica.
 * Mantener el archivo cargado después de prism.js y antes del resaltado.
 */
(function (Prism) {
    "use strict";

    if (!Prism) return;

    Prism.languages.cisco = {
        // Comentarios Cisco IOS
        comment: {
            pattern: /(^[ \t]*)![^\r\n]*/m,
            lookbehind: true,
            greedy: true
        },

        // Cadenas entre comillas
        string: {
            pattern: /"(?:\\.|[^"\\])*"/,
            greedy: true
        },

        // Direcciones IPv4
        ip: {
            pattern: /\b(?:\d{1,3}\.){3}\d{1,3}(?:\/(?:[12]?\d|3[0-2]))?\b/,
            alias: "number"
        },

        // Interfaces habituales
        interface: {
            pattern: /\b(?:GigabitEthernet|TenGigabitEthernet|FastEthernet|Ethernet|Loopback|Vlan|Serial|Port-channel|Tunnel|MgmtEth)\d+(?:\/\d+)*(?:\.\d+)?\b/i,
            alias: "class-name"
        },

        // Comandos de configuración
        keyword: /\b(?:configure|terminal|hostname|interface|description|shutdown|enable|disable|router|ospf|bgp|eigrp|network|area|neighbor|remote-as|address-family|redistribute|passive-interface|switchport|mode|access|trunk|vlan|encapsulation|dot1q|spanning-tree|ip|ipv6|address|route|access-list|permit|deny|logging|snmp-server|ntp|service|username|password|secret|line|transport|login|banner|exit|end|write|copy|show|clear|debug|ping|traceroute|default-information|originate|priority|cost|duplex|speed|mtu|channel-group|allowed|native|router-id|wildcard)\b/i,

        // Modificadores
        boolean: /\b(?:no|default|yes|true|false)\b/i,

        // Valores numéricos
        number: /\b\d+\b/,

        // Operadores y símbolos
        operator: /[=]/,
        punctuation: /[()[\]{},]/
    };

    // Alias adicional
    Prism.languages["cisco-ios"] = Prism.languages.cisco;


    // =====================================================
    // Huawei VRP - Syntax Highlighting
    // =====================================================

    Prism.languages.huawei = {
        // Comentarios habituales de configuración VRP
        comment: {
            pattern: /(^[ \t]*)#[^\r\n]*/m,
            lookbehind: true,
            greedy: true
        },

        // Cadenas entre comillas
        string: {
            pattern: /"(?:\\.|[^"\\])*"/,
            greedy: true
        },

        // Direcciones IPv4 y prefijos CIDR
        ip: {
            pattern: /\b(?:\d{1,3}\.){3}\d{1,3}(?:\/(?:[12]?\d|3[0-2]))?\b/,
            alias: "number"
        },

        // Interfaces Huawei
        interface: {
            pattern: /\b(?:GigabitEthernet|XGigabitEthernet|10GE|25GE|40GE|100GE|Eth-Trunk|Vlanif|LoopBack|Ethernet|MEth|Serial|Tunnel)\d+(?:\/\d+)*(?:\.\d+)?\b/i,
            alias: "class-name"
        },

        // Comandos y palabras reservadas
        keyword: /\b(?:system-view|sysname|interface|description|shutdown|undo|quit|return|save|display|reset|reboot|ip|ipv6|address|route-static|ospf|bgp|isis|area|network|peer|as-number|router-id|import-route|export-route|silent-interface|vlan|vlanif|port|link-type|access|trunk|hybrid|default|allow-pass|eth-trunk|mode|lacp|stp|enable|snmp-agent|ntp-service|user-interface|authentication-mode|protocol|inbound|acl|rule|permit|deny|traffic|classifier|behavior|policy|qos|dhcp|nat|firewall|security-policy|aaa|local-user|password|cipher|simple|level|service-type|ssh|stelnet|telnet|console|commit|configuration)\b/i,

        // Valores lógicos y modificadores
        boolean: /\b(?:enable|disable|undo|true|false)\b/i,

        // Números
        number: /\b\d+\b/,

        // Operadores
        operator: /=/,

        // Símbolos
        punctuation: /[()[\]{},]/
    };

    // Alias
    Prism.languages.vrp = Prism.languages.huawei;

    // =====================================================
    // MikroTik RouterOS - Syntax Highlighting
    // =====================================================

    Prism.languages.mikrotik = {
        // Comentarios: # comentario
        comment: {
            pattern: /#[^\r\n]*/,
            greedy: true
        },

        // Cadenas entre comillas
        string: {
            pattern: /"(?:\\[\s\S]|[^"\\])*"/,
            greedy: true
        },

        // Variables RouterOS: $variable
        variable: /\$[a-zA-Z_][\w-]*/,

        // Direcciones IPv4, con máscara CIDR opcional
        ip: {
            pattern: /\b(?:\d{1,3}\.){3}\d{1,3}(?:\/(?:[12]?\d|3[0-2]))?\b/,
            alias: "number"
        },

        // Rutas de configuración RouterOS
        path: {
            pattern: /(^[ \t]*)\/(?:[a-z][\w-]*(?:[ \t]+[a-z][\w-]*)*)/im,
            lookbehind: true,
            alias: "class-name"
        },

        // Nombres de parámetros
        property: {
            pattern: /\b[a-z][\w-]*(?:\.[a-z][\w-]*)*(?==)/i,
            alias: "attr-name"
        },

        // Comandos RouterOS
        keyword: /\b(?:add|set|remove|enable|disable|print|find|get|export|import|reset|monitor|edit|move|comment|run|put|log|error|warning|info|debug|foreach|for|while|do|if|else|return|break|continue|local|global|environment|execute|delay|resolve|ping|traceroute|tool|interface|bridge|vlan|routing|ospf|bgp|firewall|filter|nat|mangle|address-list|connection|queue|simple|tree|dhcp-server|dhcp-client|dns|ip|ipv6|system|identity|user|scheduler|script|backup|restore)\b/i,

        // Valores booleanos y opciones habituales
        boolean: /\b(?:yes|no|true|false|enabled|disabled|auto)\b/i,

        // Números
        number: /\b\d+\b/,

        // Operadores
        operator: /(?:->|!=|<=|>=|&&|\|\||[=<>!])/,

        // Símbolos y separadores
        punctuation: /[()[\]{},;:]/
    };

    // Alias adicionales
    Prism.languages.routeros = Prism.languages.mikrotik;
    Prism.languages["mikrotik-routeros"] = Prism.languages.mikrotik;


    // =====================================================
    // Nokia SR OS - Classic CLI Syntax Highlighting
    // =====================================================

    Prism.languages.nokia = {

        // Comentarios
        comment: {
            pattern: /(^[ \t]*)#[^\r\n]*/m,
            lookbehind: true,
            greedy: true
        },

        // Cadenas entre comillas
        string: {
            pattern: /"(?:\\.|[^"\\])*"/,
            greedy: true
        },

        // Direcciones IPv4 y prefijos CIDR
        ip: {
            pattern: /\b(?:\d{1,3}\.){3}\d{1,3}(?:\/(?:[12]?\d|3[0-2]))?\b/,
            alias: "number"
        },

        // Direcciones MAC
        mac: {
            pattern: /\b(?:[0-9a-f]{2}:){5}[0-9a-f]{2}\b/i,
            alias: "number"
        },

        // Identificadores de puertos Nokia
        port: {
            pattern: /\b\d+\/\d+\/\d+(?::\d+)?\b/,
            alias: "class-name"
        },

        // Palabras reservadas y comandos habituales
        keyword: /\b(?:configure|system|name|router|interface|address|port|description|admin-state|shutdown|no|exit|all|back|info|show|display|monitor|clear|debug|environment|candidate|commit|save|rollback|ospf|ospf3|bgp|isis|mpls|ldp|rsvp|segment-routing|policy-options|prefix-list|policy-statement|entry|from|to|action|accept|reject|default-action|neighbor|group|family|ipv4|ipv6|vpn-ipv4|vpn-ipv6|autonomous-system|local-as|peer-as|router-id|area|network|redistribute|import|export|next-hop|metric|preference|type|level|enable|disable|authentication|password|hello-interval|dead-interval|bfd|ecmp|static-route|service|vprn|vpls|epipe|sap|sdp|customer|create|delete|mtu|lag|lacp|vlan|qos|filter|ip-filter|mac-filter|ingress|egress|rate|queue|scheduler|log|snmp|ntp|time|user|aaa)\b/i,

        // Valores de estado
        boolean: /\b(?:enabled|disabled|up|down|true|false)\b/i,

        // Números
        number: /\b\d+\b/,

        // Operadores
        operator: /[=]/,

        // Símbolos
        punctuation: /[()[\]{},;:]/
    };

    // Alias para Nokia SR OS
    Prism.languages.sros = Prism.languages.nokia;
    Prism.languages["nokia-sros"] = Prism.languages.nokia;


    // =====================================================
    // Aruba AOS-CX - Syntax Highlighting
    // =====================================================

    Prism.languages.aruba = {

        // Comentarios y separadores de configuración
        comment: {
            pattern: /(^[ \t]*)![^\r\n]*/m,
            lookbehind: true,
            greedy: true
        },

        // Cadenas entre comillas
        string: {
            pattern: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/,
            greedy: true
        },

        // Direcciones IPv4 y prefijos CIDR
        ip: {
            pattern: /\b(?:\d{1,3}\.){3}\d{1,3}(?:\/(?:[12]?\d|3[0-2]))?\b/,
            alias: "number"
        },

        // Interfaces físicas, VLAN, LAG y loopback
        interface: {
            pattern: /\b(?:\d+\/\d+\/\d+(?::\d+)?|vlan\d+|lag\d+|loopback\d+|mgmt)\b/i,
            alias: "class-name"
        },

        // Comandos y palabras reservadas de AOS-CX
        keyword: /\b(?:configure|terminal|hostname|interface|description|shutdown|no|exit|end|show|copy|write|erase|reload|vlan|name|tagged|untagged|access|trunk|allowed|native|routing|ip|ipv6|address|route|default-gateway|dhcp|helper-address|vsx|isl|keepalive|role|primary|secondary|lag|lacp|mode|active|passive|spanning-tree|rstp|mstp|priority|port-type|admin-edge|bpdu-guard|loop-protect|storm-control|lldp|cdp|qos|dscp|class|policy|apply|acl|access-list|permit|deny|ospf|bgp|router|router-id|network|area|neighbor|remote-as|address-family|redistribute|passive-interface|authentication|username|password|ssh|snmp-server|ntp|logging|https-server|rest|vrf|enable|disable|debug|ping|traceroute)\b/i,

        // Valores de estado y modificadores
        boolean: /\b(?:true|false|enable|disable|enabled|disabled|up|down)\b/i,

        // Valores numéricos
        number: /\b\d+\b/,

        // Operadores
        operator: /=/,

        // Símbolos
        punctuation: /[()[\]{},;:]/
    };

    // Alias Aruba AOS-CX
    Prism.languages["aruba-cx"] = Prism.languages.aruba;
    Prism.languages.aoscx = Prism.languages.aruba;


    // =====================================================
    // Fortinet FortiOS - Syntax Highlighting
    // =====================================================

    Prism.languages.fortios = {

        // Comentarios de configuración
        comment: {
            pattern: /(^[ \t]*)#[^\r\n]*/m,
            lookbehind: true,
            greedy: true
        },

        // Cadenas entre comillas
        string: {
            pattern: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/,
            greedy: true
        },

        // Direcciones IPv4 y prefijos CIDR
        ip: {
            pattern: /\b(?:\d{1,3}\.){3}\d{1,3}(?:\/(?:[12]?\d|3[0-2]))?\b/,
            alias: "number"
        },

        // Direcciones MAC
        mac: {
            pattern: /\b(?:[0-9a-f]{2}:){5}[0-9a-f]{2}\b/i,
            alias: "number"
        },

        // Propiedades habituales
        property: {
            pattern: /(^[ \t]*set[ \t]+)[a-z][\w-]*/im,
            lookbehind: true,
            alias: "attr-name"
        },

        // Comandos principales de FortiOS
        command: {
            pattern: /(^[ \t]*)(?:config|edit|set|unset|append|unselect|select|next|end|abort|rename|clone|delete|purge|move|execute|diagnose|get|show)\b/im,
            lookbehind: true,
            alias: "keyword"
        },

        // Bloques de configuración
        keyword: /\b(?:system|global|interface|settings|admin|accprofile|vdom|firewall|policy|address|addrgrp|service|custom|group|vip|ippool|schedule|recurring|one-time|router|static|ospf|bgp|rip|neighbor|network|redistribute|prefix-list|route-map|access-list|vpn|ipsec|phase1-interface|phase2-interface|ssl|web|user|local|authentication|ldap|radius|switch-controller|wireless-controller|security|utm|antivirus|webfilter|ips|application|dnsfilter|log|fortianalyzer|fortiguard|snmp|ntp|dns|dhcp|server|client|ha|cluster|virtual-switch|zone|software-switch|hardware-switch|sdwan|members|health-check|central-snat-map|traffic-shaper)\b/i,

        // Estados y opciones
        boolean: /\b(?:enable|disable|enabled|disabled|yes|no|true|false|accept|deny|all|always|any)\b/i,

        // Interfaces Fortinet habituales
        interface: {
            pattern: /\b(?:port\d+|wan\d+|lan\d+|internal\d*|dmz\d*|mgmt\d*|vlan\d+|ssl\.root)\b/i,
            alias: "class-name"
        },

        // Valores numéricos
        number: /\b\d+\b/,

        // Operadores
        operator: /=/,

        // Símbolos
        punctuation: /[()[\]{},;:]/
    };

    // Alias adicionales
    Prism.languages.fortinet = Prism.languages.fortios;
    Prism.languages.fortigate = Prism.languages.fortios;


    // =====================================================
    // Network - Generic Networking Syntax Highlighting
    // =====================================================

    Prism.languages.network = {

        // Comentarios habituales: !, # y //
        comment: {
            pattern: /(^[ \t]*)(?:[!#][^\r\n]*|\/\/[^\r\n]*)/m,
            lookbehind: true,
            greedy: true
        },

        // Cadenas entre comillas
        string: {
            pattern: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/,
            greedy: true
        },

        // Direcciones MAC en formato habitual
        mac: {
            pattern: /\b(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b|\b(?:[0-9a-f]{4}\.){2}[0-9a-f]{4}\b/i,
            alias: "number"
        },

        // Direcciones IPv4 y prefijos CIDR
        ip: {
            pattern: /\b(?:\d{1,3}\.){3}\d{1,3}(?:\/(?:[12]?\d|3[0-2]))?\b/,
            alias: "number"
        },

        // Interfaces habituales de distintos fabricantes
        interface: {
            pattern: /\b(?:GigabitEthernet|TenGigabitEthernet|FastEthernet|Ethernet|Loopback|LoopBack|Vlanif|Vlan|Serial|Tunnel|Port-channel|Eth-Trunk|XGigabitEthernet|lag|ether|sfp-sfpplus)\d+(?:\/\d+)*(?:\.\d+)?\b/i,
            alias: "class-name"
        },

        // Comandos habituales de networking
        keyword: /\b(?:configure|terminal|config|system-view|sysname|hostname|interface|description|shutdown|undo|no|exit|quit|end|next|edit|set|add|remove|delete|enable|disable|show|display|print|export|save|commit|write|copy|router|routing|ip|ipv6|address|network|route|static|default|gateway|vlan|switchport|access|trunk|native|tagged|untagged|bridge|port|ospf|ospf3|bgp|isis|eigrp|rip|mpls|ldp|neighbor|peer|remote-as|local-as|router-id|area|redistribute|import|policy|route-map|prefix-list|access-list|acl|permit|deny|firewall|filter|nat|masquerade|snat|dnat|vpn|ipsec|gre|vxlan|lacp|lag|stp|rstp|mstp|lldp|cdp|snmp|ntp|dns|dhcp|qos|mtu|speed|duplex|authentication|username|password|secret|logging|debug|ping|traceroute)\b/i,

        // Estados y modificadores
        boolean: /\b(?:true|false|yes|no|enable|disable|enabled|disabled|up|down|active|inactive|accept|reject|drop|allow|deny)\b/i,

        // Números
        number: /\b\d+\b/,

        // Operadores
        operator: /(?:->|!=|<=|>=|&&|\|\||[=<>])/,

        // Símbolos y separadores
        punctuation: /[()[\]{},;:]/
    };

    // Alias adicionales
    Prism.languages.networking = Prism.languages.network;
    Prism.languages.netconfig = Prism.languages.network;


})(window.Prism);
